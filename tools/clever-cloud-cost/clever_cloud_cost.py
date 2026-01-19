#!/usr/bin/env python3
"""
Clever Cloud Cost Calculator

This script retrieves the list of applications and add-ons from Clever Cloud,
identifies their instance types (flavors), and calculates the projected monthly cost.

Requirements:
    - clever-tools CLI installed and authenticated (npm install -g clever-tools && clever login)
    - Python 3.8+

Usage:
    python clever_cloud_cost.py
    python clever_cloud_cost.py --org <org_id>
    python clever_cloud_cost.py --json
    python clever_cloud_cost.py --csv > costs.csv
"""

import argparse
import json
import subprocess
import sys
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# PRICING DATA (as of 2025 - prices in EUR/month)
# Source: https://www.clever.cloud/pricing/
# =============================================================================

# Application instance pricing (per scaler/month)
APP_FLAVOR_PRICING = {
    # Flavor: (vCPUs, RAM_GB, price_EUR_month)
    'pico': (0.5, 0.25, 4.50),
    'nano': (1, 0.5, 6.00),
    'XS': (1, 1, 16.00),
    'S': (2, 2, 32.00),
    'M': (4, 4, 64.00),
    'L': (6, 8, 128.00),
    'XL': (8, 16, 256.00),
    '2XL': (12, 24, 384.00),
    '3XL': (16, 32, 512.00),
}

# PostgreSQL addon pricing
# Source: https://www.clever.cloud/pricing/
# Plans follow pattern: {size}_{storage} where storage is sml/med/big/hug/gnt
POSTGRESQL_PRICING = {
    # Plan: (vCPUs, RAM_GB, Storage_GB, price_EUR_month)
    'dev': (0, 0.256, 0.256, 0),  # Free dev plan

    # XXS tier (512 MB RAM)
    'xxs_sml': (1, 0.5, 1, 5.25),
    'xxs_med': (1, 0.5, 2, 7.00),
    'xxs_big': (1, 0.5, 3, 9.00),

    # XS tier (1 GB RAM)
    'xs_tny': (1, 1, 2, 10.00),
    'xs_sml': (1, 1, 5, 13.00),
    'xs_med': (1, 1, 10, 20.00),
    'xs_big': (1, 1, 15, 28.00),

    # S tier (2 GB RAM)
    's_sml': (2, 2, 10, 41.00),
    's_med': (2, 2, 15, 55.00),
    's_big': (2, 2, 20, 68.00),
    's_hug': (2, 2, 50, 110.00),

    # M tier (4 GB RAM)
    'm_sml': (4, 4, 20, 88.00),
    'm_med': (4, 4, 40, 130.00),
    'm_big': (4, 4, 80, 200.00),

    # L tier (8 GB RAM)
    'l_sml': (6, 8, 40, 178.00),
    'l_med': (6, 8, 80, 270.00),
    'l_big': (6, 8, 120, 350.00),
    'l_gnt': (6, 8, 480, 900.00),  # Giant storage

    # XL tier (16 GB RAM)
    'xl_sml': (8, 16, 80, 360.00),
    'xl_med': (8, 16, 160, 520.00),
    'xl_big': (8, 16, 320, 780.00),
    'xl_hug': (8, 16, 480, 1000.00),
    'xl_gnt': (8, 16, 640, 1200.00),

    # XXL tier (64 GB RAM)
    'xxl_sml': (12, 64, 160, 1730.00),
    'xxl_med': (12, 64, 320, 2100.00),
    'xxl_big': (12, 64, 640, 2800.00),
    'xxl_hug': (12, 64, 960, 3500.00),

    # XXXL tier
    'xxxl_sml': (16, 128, 640, 3500.00),
    'xxxl_med': (16, 128, 960, 4200.00),
    'xxxl_big': (16, 128, 1200, 5000.00),
}

# Redis addon pricing
REDIS_PRICING = {
    'dev': (0, 0.256, 0),  # Free dev plan
    's_mono': (0, 0.25, 8.40),
    'm_mono': (0, 1, 26.40),
    'l_mono': (0, 2, 54.00),
}

# Elasticsearch addon pricing
ELASTICSEARCH_PRICING = {
    'dev': (0, 0.5, 0),  # Free dev plan
    'xs': (1, 1, 28.00),
    's': (2, 2, 54.00),
    'm': (4, 4, 108.00),
    'l': (6, 8, 215.00),
    'xl': (8, 16, 430.00),
}

# Cellar (S3) pricing - per GB/month
CELLAR_PRICING = {
    'storage_per_gb': 0.02,  # EUR per GB/month
    'outbound_per_gb': 0.09,  # EUR per GB outbound
}

# MongoDB addon pricing
MONGODB_PRICING = {
    'dev': (0, 0.5, 1, 0),
    'xs_sml': (1, 0.5, 5, 19.50),
    's_sml': (2, 2, 10, 57.00),
    'm_sml': (4, 4, 20, 114.00),
    'l_sml': (6, 8, 40, 230.00),
}

# MySQL addon pricing
MYSQL_PRICING = {
    'dev': (0, 0.256, 0.256, 0),
    'xxs_sml': (1, 0.5, 1, 5.25),
    'xs_sml': (1, 1, 5, 13.00),
    's_sml': (2, 2, 10, 41.00),
    'm_sml': (4, 4, 20, 88.00),
    'l_sml': (6, 8, 40, 178.00),
}


class Category(Enum):
    """Resource categories for cost grouping"""
    PRODUCTION = "Production"
    STAGING = "Staging"
    REVIEW_APP = "Review Apps (PRs)"
    DATA_WAREHOUSE = "Entrepôt de données"
    SHOWCASE = "Site vitrine"
    OTHER = "Autres"


@dataclass
class Resource:
    """Represents a Clever Cloud resource (app or addon)"""
    id: str
    name: str
    type: str  # 'app' or 'addon'
    provider: str  # e.g., 'node', 'postgresql-addon', etc.
    plan_or_flavor: str
    instances: int
    monthly_cost: float
    details: Dict
    category: Category = Category.OTHER


def categorize_resource(name: str, provider: str) -> Category:
    """
    Categorize a resource based on its name and provider.

    Args:
        name: Resource name
        provider: Resource provider type

    Returns:
        Category enum value
    """
    name_lower = name.lower()

    # Review apps (PRs)
    if 'pr' in name_lower and any(c.isdigit() for c in name_lower):
        return Category.REVIEW_APP
    if 'review' in name_lower:
        return Category.REVIEW_APP
    if 'dpe' in name_lower:
        return Category.REVIEW_APP

    # Showcase / Landing page (site vitrine)
    if any(kw in name_lower for kw in ['vitrine', 'landing', 'www', 'site-', 'marketing']):
        return Category.SHOWCASE
    # Beta.gouv showcase sites
    if 'beta.gouv' in name_lower or 'betagouv' in name_lower:
        return Category.SHOWCASE

    # Data warehouse / Analytics
    if any(kw in name_lower for kw in ['dagster', 'metabase', 'elasticsearch', 'kibana', 'datalake', 'analytics']):
        return Category.DATA_WAREHOUSE
    if provider.lower() in ['es-addon', 'elastic', 'kibana']:
        return Category.DATA_WAREHOUSE

    # Staging
    if 'staging' in name_lower or 'stag' in name_lower:
        return Category.STAGING
    if 'dev' in name_lower and 'maildev' not in name_lower:
        return Category.STAGING

    # Production
    if 'prod' in name_lower or 'production' in name_lower:
        return Category.PRODUCTION

    # Check for specific production indicators
    if any(kw in name_lower for kw in ['api production', 'front production', 'queue production', 'script runner']):
        return Category.PRODUCTION

    return Category.OTHER


def run_clever_command(args: List[str]) -> Tuple[bool, str]:
    """
    Run a clever CLI command and return the output.

    Args:
        args: Command arguments (without 'clever' prefix)

    Returns:
        Tuple of (success, output)
    """
    try:
        cmd = ['clever'] + args
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
    except FileNotFoundError:
        return False, "Error: 'clever' CLI not found. Install with: npm install -g clever-tools"
    except subprocess.TimeoutExpired:
        return False, "Error: Command timed out"
    except Exception as e:
        return False, f"Error: {str(e)}"


def get_applications(org_id: Optional[str] = None) -> List[Dict]:
    """
    Get list of all applications.

    The clever applications list command returns a hierarchical structure:
    [
        {
            "id": "orga_xxx",
            "name": "Organization Name",
            "applications": [...]
        },
        ...
    ]

    This function flattens it to a simple list of applications.

    Args:
        org_id: Optional organization ID to filter by

    Returns:
        List of application dictionaries (flattened)
    """
    args = ['applications', 'list', '--format', 'json']
    if org_id:
        args.extend(['--org', org_id])

    success, output = run_clever_command(args)
    if not success:
        print(f"Warning: Failed to get applications: {output}", file=sys.stderr)
        return []

    try:
        data = json.loads(output) if output.strip() else []
    except json.JSONDecodeError as e:
        print(f"Warning: Failed to parse applications JSON: {e}", file=sys.stderr)
        return []

    # Flatten hierarchical structure (organizations -> applications)
    applications = []
    for item in data:
        if 'applications' in item:
            # This is an organization with nested applications
            org_name = item.get('name', 'unknown')
            org_id_item = item.get('id', '')
            for app in item['applications']:
                app['org_name'] = org_name
                app['org_id'] = app.get('org_id', org_id_item)
                applications.append(app)
        elif 'app_id' in item or 'id' in item:
            # This is a direct application entry
            applications.append(item)

    return applications


def get_addons(org_id: Optional[str] = None) -> List[Dict]:
    """
    Get list of all add-ons.

    Args:
        org_id: Optional organization ID to filter by

    Returns:
        List of addon dictionaries
    """
    args = ['addon', 'list', '--format', 'json']
    if org_id:
        args.extend(['--org', org_id])

    success, output = run_clever_command(args)
    if not success:
        print(f"Warning: Failed to get addons: {output}", file=sys.stderr)
        return []

    try:
        return json.loads(output) if output.strip() else []
    except json.JSONDecodeError as e:
        print(f"Warning: Failed to parse addons JSON: {e}", file=sys.stderr)
        return []


def get_app_details(app_id: str, org_id: Optional[str] = None) -> Dict:
    """
    Get detailed information about an application including flavor and pricing.

    Args:
        app_id: Application ID
        org_id: Organization ID (required for most API calls)

    Returns:
        Dictionary with flavor info and pricing, or empty dict if not found
    """
    # Try different API endpoints with full URL (required by clever curl)
    endpoints = []
    if org_id:
        endpoints.append(f'https://api.clever-cloud.com/v2/organisations/{org_id}/applications/{app_id}')
    endpoints.append(f'https://api.clever-cloud.com/v2/self/applications/{app_id}')

    for endpoint in endpoints:
        args = ['curl', endpoint]
        success, output = run_clever_command(args)

        if success and output.strip():
            try:
                # Filter out curl progress output
                lines = output.strip().split('\n')
                json_line = next((l for l in lines if l.startswith('{')), None)
                if not json_line:
                    continue

                data = json.loads(json_line)
                instance = data.get('instance', {})

                # Get flavor info from minFlavor/maxFlavor
                min_flavor = instance.get('minFlavor', {})
                max_flavor = instance.get('maxFlavor', {})

                min_instances = instance.get('minInstances', 1)
                max_instances = instance.get('maxInstances', 1)

                # Get flavor name (use min flavor as reference)
                flavor_name = min_flavor.get('name', 'unknown')
                max_flavor_name = max_flavor.get('name', flavor_name)

                # Get hourly price (convert to monthly: price * 24 * 30)
                min_price_hourly = min_flavor.get('price', 0)
                max_price_hourly = max_flavor.get('price', 0)

                return {
                    'min_flavor': flavor_name,
                    'max_flavor': max_flavor_name,
                    'min_instances': min_instances,
                    'max_instances': max_instances,
                    'min_price_hourly': min_price_hourly,
                    'max_price_hourly': max_price_hourly,
                    'state': data.get('state', 'unknown'),
                }
            except (json.JSONDecodeError, KeyError, TypeError, StopIteration):
                continue

    return {}


def calculate_app_cost(flavor: str, min_instances: int, max_instances: int) -> float:
    """
    Calculate monthly cost for an application.
    Uses the average of min and max instances for estimation.

    Args:
        flavor: Instance flavor (XS, S, M, L, XL, etc.)
        min_instances: Minimum number of instances
        max_instances: Maximum number of instances

    Returns:
        Estimated monthly cost in EUR
    """
    # Normalize flavor name
    flavor_normalized = flavor.upper() if flavor else 'unknown'

    # Handle special cases
    if flavor_normalized in APP_FLAVOR_PRICING:
        _, _, price = APP_FLAVOR_PRICING[flavor_normalized]
    elif flavor.lower() in APP_FLAVOR_PRICING:
        _, _, price = APP_FLAVOR_PRICING[flavor.lower()]
    else:
        # Unknown flavor, use XS as default
        _, _, price = APP_FLAVOR_PRICING.get('XS', (1, 1, 16.00))

    # Use average instances for estimation
    avg_instances = (min_instances + max_instances) / 2
    return price * avg_instances


def calculate_addon_cost(provider: str, plan: str) -> float:
    """
    Calculate monthly cost for an add-on.

    Args:
        provider: Add-on provider (postgresql-addon, redis-addon, etc.)
        plan: Add-on plan name

    Returns:
        Estimated monthly cost in EUR
    """
    plan_lower = plan.lower() if plan else ''

    # Map provider to pricing table
    pricing_tables = {
        'postgresql-addon': POSTGRESQL_PRICING,
        'mysql-addon': MYSQL_PRICING,
        'mongodb-addon': MONGODB_PRICING,
        'redis-addon': REDIS_PRICING,
        'es-addon': ELASTICSEARCH_PRICING,
        'elastic': ELASTICSEARCH_PRICING,
    }

    pricing_table = pricing_tables.get(provider.lower())

    if pricing_table:
        # Try exact match first
        if plan_lower in pricing_table:
            return pricing_table[plan_lower][-1]  # Last element is price

        # Try partial match
        for key, values in pricing_table.items():
            if key in plan_lower or plan_lower in key:
                return values[-1]

    # Cellar (S3-compatible storage)
    if 'cellar' in provider.lower():
        # Assume 100GB as default estimation
        return CELLAR_PRICING['storage_per_gb'] * 100

    return 0.0


def process_resources(apps: List[Dict], addons: List[Dict], verbose: bool = False) -> List[Resource]:
    """
    Process applications and add-ons into unified resource list with costs.

    Args:
        apps: List of application data
        addons: List of addon data
        verbose: Print progress during processing

    Returns:
        List of Resource objects with calculated costs
    """
    resources = []

    # Process applications
    total_apps = len(apps)
    for idx, app in enumerate(apps):
        app_id = app.get('app_id') or app.get('id', 'unknown')
        name = app.get('name', 'unknown')
        org_id = app.get('org_id', '')
        org_name = app.get('org_name', '')
        provider = app.get('type', app.get('instance', {}).get('type', 'unknown'))

        if verbose:
            print(f"  [{idx + 1}/{total_apps}] Fetching {name}...", end='\r')

        # Get detailed app info from API
        app_details = get_app_details(app_id, org_id)

        if app_details:
            min_flavor = app_details.get('min_flavor', 'unknown')
            max_flavor = app_details.get('max_flavor', 'unknown')
            min_instances = app_details.get('min_instances', 1)
            max_instances = app_details.get('max_instances', 1)
            min_price_hourly = app_details.get('min_price_hourly', 0)
            max_price_hourly = app_details.get('max_price_hourly', 0)
            state = app_details.get('state', 'unknown')

            # Calculate cost based on actual API pricing (hourly -> monthly)
            # Use average of min and max instances and flavors for estimation
            avg_instances = (min_instances + max_instances) / 2
            avg_price_hourly = (min_price_hourly + max_price_hourly) / 2
            cost = avg_price_hourly * 24 * 30 * avg_instances  # hourly to monthly

            flavor_display = f"{min_flavor}-{max_flavor}" if min_flavor != max_flavor else min_flavor
        else:
            # Fallback to static pricing
            min_flavor = 'unknown'
            max_flavor = 'unknown'
            min_instances = 1
            max_instances = 1
            state = 'unknown'
            flavor_display = 'unknown'
            cost = calculate_app_cost('XS', 1, 1)

        display_name = f"{org_name} / {name}" if org_name else name
        category = categorize_resource(name, provider)

        resources.append(Resource(
            id=app_id,
            name=display_name,
            type='application',
            provider=provider,
            plan_or_flavor=flavor_display,
            instances=max_instances,
            monthly_cost=cost,
            details={
                'min_flavor': min_flavor,
                'max_flavor': max_flavor,
                'min_instances': min_instances,
                'max_instances': max_instances,
                'state': state,
                'org_id': org_id,
                'org_name': org_name,
            },
            category=category,
        ))

    # Process add-ons
    for addon in addons:
        addon_id = addon.get('addon_id') or addon.get('id', 'unknown')
        name = addon.get('name', 'unknown')
        provider = addon.get('provider', {}).get('id', addon.get('providerId', 'unknown'))
        plan = addon.get('plan', {}).get('slug', addon.get('planSlug', 'unknown'))

        # Calculate cost
        cost = calculate_addon_cost(provider, plan)

        # Categorize addon
        category = categorize_resource(name, provider)

        resources.append(Resource(
            id=addon_id,
            name=name,
            type='addon',
            provider=provider,
            plan_or_flavor=plan,
            instances=1,
            monthly_cost=cost,
            details={
                'plan': plan,
                'provider': provider,
            },
            category=category,
        ))

    return resources


def print_table(resources: List[Resource]) -> None:
    """Print resources as a formatted table."""
    if not resources:
        print("No resources found.")
        return

    # Calculate column widths
    headers = ['Type', 'Name', 'Provider', 'Plan/Flavor', 'Instances', 'Monthly Cost (EUR)']
    rows = [
        [
            r.type,
            r.name[:30] + '...' if len(r.name) > 30 else r.name,
            r.provider[:20] + '...' if len(r.provider) > 20 else r.provider,
            r.plan_or_flavor,
            str(r.instances),
            f"{r.monthly_cost:.2f}"
        ]
        for r in resources
    ]

    # Calculate widths
    widths = [
        max(len(headers[i]), max(len(row[i]) for row in rows))
        for i in range(len(headers))
    ]

    # Print header
    header_line = ' | '.join(h.ljust(widths[i]) for i, h in enumerate(headers))
    separator = '-+-'.join('-' * w for w in widths)

    print()
    print(header_line)
    print(separator)

    # Print rows
    for row in rows:
        print(' | '.join(row[i].ljust(widths[i]) for i in range(len(row))))

    # Print total
    total = sum(r.monthly_cost for r in resources)
    print(separator)
    print(f"{'TOTAL':>{sum(widths[:5]) + 3 * 4}} | {total:>{widths[5]}.2f}")
    print()


def print_category_summary(resources: List[Resource]) -> None:
    """Print costs grouped by category."""
    print("=" * 60)
    print("COÛTS PAR CATÉGORIE")
    print("=" * 60)

    # Group by category
    category_costs: Dict[Category, Dict] = {}
    for cat in Category:
        category_costs[cat] = {'apps': 0.0, 'addons': 0.0, 'count': 0}

    for r in resources:
        category_costs[r.category]['count'] += 1
        if r.type == 'application':
            category_costs[r.category]['apps'] += r.monthly_cost
        else:
            category_costs[r.category]['addons'] += r.monthly_cost

    # Print category summary
    total = 0.0
    print(f"\n{'Catégorie':<25} {'Apps':>12} {'Add-ons':>12} {'Total':>12} {'Nb':>6}")
    print("-" * 70)

    for cat in Category:
        costs = category_costs[cat]
        cat_total = costs['apps'] + costs['addons']
        if cat_total > 0 or costs['count'] > 0:
            print(f"{cat.value:<25} {costs['apps']:>10.2f} € {costs['addons']:>10.2f} € {cat_total:>10.2f} € {costs['count']:>6}")
            total += cat_total

    print("-" * 70)
    print(f"{'TOTAL':<25} {'':<12} {'':<12} {total:>10.2f} €")
    print()


def print_json(resources: List[Resource]) -> None:
    """Print resources as JSON."""
    # Group costs by category
    category_totals = {}
    for cat in Category:
        cat_resources = [r for r in resources if r.category == cat]
        if cat_resources:
            category_totals[cat.value] = {
                'apps': sum(r.monthly_cost for r in cat_resources if r.type == 'application'),
                'addons': sum(r.monthly_cost for r in cat_resources if r.type == 'addon'),
                'total': sum(r.monthly_cost for r in cat_resources),
                'count': len(cat_resources),
            }

    data = {
        'resources': [
            {
                'id': r.id,
                'name': r.name,
                'type': r.type,
                'provider': r.provider,
                'plan_or_flavor': r.plan_or_flavor,
                'instances': r.instances,
                'monthly_cost': r.monthly_cost,
                'category': r.category.value,
                'details': r.details,
            }
            for r in resources
        ],
        'by_category': category_totals,
        'total_monthly_cost': sum(r.monthly_cost for r in resources),
    }
    print(json.dumps(data, indent=2))


def print_csv(resources: List[Resource]) -> None:
    """Print resources as CSV."""
    print("type,name,provider,plan_or_flavor,instances,monthly_cost_eur,category")
    for r in resources:
        # Escape quotes in names
        name = r.name.replace('"', '""')
        print(f'"{r.type}","{name}","{r.provider}","{r.plan_or_flavor}",{r.instances},{r.monthly_cost:.2f},"{r.category.value}"')


def main():
    parser = argparse.ArgumentParser(
        description='Calculate Clever Cloud projected monthly costs'
    )
    parser.add_argument(
        '--org', '-o',
        help='Organization ID to filter resources'
    )
    parser.add_argument(
        '--json', '-j',
        action='store_true',
        help='Output as JSON'
    )
    parser.add_argument(
        '--csv',
        action='store_true',
        help='Output as CSV'
    )

    args = parser.parse_args()

    # Check if clever CLI is available
    success, _ = run_clever_command(['--version'])
    if not success:
        print("Error: clever-tools CLI is not installed or not authenticated.", file=sys.stderr)
        print("Install with: npm install -g clever-tools", file=sys.stderr)
        print("Then authenticate with: clever login", file=sys.stderr)
        sys.exit(1)

    # Print header (only for table output)
    if not args.json and not args.csv:
        print("=" * 80)
        print("CLEVER CLOUD COST CALCULATOR")
        print("=" * 80)
        print("Fetching resources...")

    # Get resources
    apps = get_applications(args.org)
    addons = get_addons(args.org)

    verbose = not args.json and not args.csv
    if verbose:
        print(f"Found {len(apps)} applications and {len(addons)} add-ons")
        print("Fetching application details (this may take a moment)...")

    # Process and calculate costs
    resources = process_resources(apps, addons, verbose=verbose)

    if verbose:
        print(" " * 80)  # Clear progress line

    # Output
    if args.json:
        print_json(resources)
    elif args.csv:
        print_csv(resources)
    else:
        print_table(resources)

        # Summary by category
        print_category_summary(resources)

        # Summary by type
        app_cost = sum(r.monthly_cost for r in resources if r.type == 'application')
        addon_cost = sum(r.monthly_cost for r in resources if r.type == 'addon')

        print("Résumé par type:")
        print(f"  Applications: {app_cost:.2f} EUR/month")
        print(f"  Add-ons:      {addon_cost:.2f} EUR/month")
        print(f"  Total:        {app_cost + addon_cost:.2f} EUR/month")
        print()
        print("Note: Costs are estimates based on published pricing.")
        print("      Actual costs may vary based on usage and scaling.")


if __name__ == '__main__':
    main()
