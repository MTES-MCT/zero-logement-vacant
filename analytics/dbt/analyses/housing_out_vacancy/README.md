# Housing Out of Vacancy Analysis

This directory contains comprehensive SQL analyses to understand the characteristics and patterns of housing that has exited vacancy, compared to housing that remains vacant. These analyses are designed to support the investment committee and help create a representative panel for the owner survey.

## 📊 Analysis Files Overview

### 1. Geographic Distribution (`01_geographic_distribution.sql`)

**Purpose**: Understand where housing exits vacancy geographically
**Charts needed**:

- Bar chart: Regional distribution of housing out vs total stock
- Horizontal bar chart: Top 20 departments by housing out count
- Scatter plot: EPCI analysis (housing out count vs percentage)
- Bar chart: Urban vs rural areas comparison

**Key insights**: Identifies geographic hotspots and patterns of vacancy exit

### 2. Housing Characteristics (`02_housing_characteristics.sql`)

**Purpose**: Analyze physical characteristics of housing that exits vacancy
**Charts needed**:

- Stacked bar chart: Housing types distribution
- Histogram: Number of rooms distribution
- Histogram: Living area ranges
- Histogram: Plot area ranges
- Bar chart: Cadastral classifications
- Pie chart: Condominium vs individual housing
- Box plot: Rental value analysis

**Key insights**: Determines which types of housing are more likely to exit vacancy

### 3. Building Characteristics (`03_building_characteristics.sql`)

**Purpose**: Examine building-specific factors affecting vacancy exit
**Charts needed**:

- Histogram: Construction periods (before 1919, 1919-1945, etc.)
- Histogram: Building age ranges
- Bar chart: Building locations
- Pie chart: Comfortable vs uncomfortable housing
- Histogram: Vacancy duration analysis
- Bar chart: Taxed vs non-taxed housing
- Bar chart: Data sources

**Key insights**: Identifies building age, comfort, and vacancy duration patterns

### 4. Mutation Analysis (`04_mutation_analysis.sql`)

**Purpose**: Analyze transaction patterns and their relationship to vacancy exit
**Charts needed**:

- Timeline: Last mutation dates by period
- Histogram: Years since last mutation
- Bar chart: Mutation types
- Histogram: Transaction value ranges
- Scatter plot: Price per m² analysis
- Scatter plot: Mutation timing vs vacancy start correlation

**Key insights**: Understanding the role of property transactions in vacancy exit

### 5. Proactivity Analysis (`05_proactivity_analysis.sql`)

**Purpose**: Measure the impact of ZLV campaigns and establishment activity
**Charts needed**:

- Bar chart: Campaign participation vs non-participation
- Histogram: Number of campaigns sent distribution
- Stacked bar chart: Establishment activity levels
- Bar chart: Establishment types
- Timeline: Campaign creation/sending dates
- Bar chart: Group participation
- Bar chart: Territory coverage
- Scatter plot: Combined proactivity score

**Key insights**: Demonstrates ZLV's impact on vacancy exit rates

### 6. Energy & Policy Territories (`06_energy_policy_territories.sql`)

**Purpose**: Analyze energy performance and policy territory effects
**Charts needed**:

- Bar chart: Energy consumption classes (A-G)
- Pie chart: Energy sieve (F-G) vs non-energy sieve
- Bar chart: Long-term vacancy (2+ years)
- Bar chart: OPAH territory impact
- Stacked bar chart: TLV1 and TLV2 territories
- Bar chart: Action Cœur de Ville territories
- Bar chart: Petite Ville de Demain
- Bar chart: Village d'Avenir
- Heatmap: Multiple policy overlaps
- Heatmap: Energy performance vs policy territories

**Key insights**: Policy effectiveness and energy performance correlation

### 7. Comparative Analysis (`07_comparative_analysis.sql`)

**Purpose**: Direct comparison between housing out vs still vacant
**Charts needed**:

- Summary table: Key metrics comparison
- Side-by-side comparison: Housing characteristics
- Map/bar chart: Geographic differences
- Histogram comparison: Building ages
- Bar chart comparison: Energy classes
- Bar chart comparison: Campaign participation
- Stacked bar chart: Policy territory coverage

**Key insights**: Clear differences between housing that exits vs remains vacant

### 8. ZLV Impact Analysis (`08_zlv_impact_analysis.sql`)

**Purpose**: Measure ZLV's specific impact and ROI
**Charts needed**:

- Bar chart: Campaign effectiveness (exit rates)
- Line chart: Campaign intensity impact
- Bar chart: Establishment activity impact
- Time series: Campaign timeline impact
- Bar chart: Territory coverage impact
- Scatter plot: Combined ZLV action score
- Table: Statistical significance tests
- Table: ROI estimation

**Key insights**: Quantifies ZLV's impact and demonstrates ROI

## 🎯 Key Questions These Analyses Answer

### For the Investment Committee

1. **Geographic Impact**: Where is ZLV most effective?
2. **Target Segments**: What types of housing benefit most from ZLV?
3. **Campaign Effectiveness**: How much do campaigns increase vacancy exit rates?
4. **ROI Demonstration**: What's the quantifiable impact of ZLV?
5. **Policy Synergies**: How do different policy territories affect outcomes?

### For the Owner Survey Panel

1. **Representative Sampling**: What characteristics should the panel include?
2. **Geographic Distribution**: Which regions/departments to include?
3. **Housing Types**: What mix of housing types is representative?
4. **Campaign Exposure**: Balance of contacted vs non-contacted owners
5. **Success Factors**: What factors correlate with vacancy exit?

## 📈 Expected Chart Types and Visualizations

### High-Impact Charts for Investment Committee

1. **Campaign Effectiveness Bar Chart**: Clear ROI demonstration
2. **Geographic Heatmap**: Show where ZLV works best
3. **Timeline Analysis**: Show ZLV's growing impact over time
4. **Comparative Summary Table**: Housing out vs still vacant key metrics
5. **Policy Territory Effectiveness**: Show synergies with other policies

### Analytical Charts for Panel Creation

1. **Characteristic Distribution Histograms**: For representative sampling
2. **Cross-tabulation Heatmaps**: Identify key segments
3. **Correlation Scatter Plots**: Find success predictors
4. **Geographic Distribution Maps**: Ensure geographic representation

## 🔍 Key Metrics to Highlight

### Impact Metrics

- **Campaign Lift**: % increase in exit rate for campaigned housing
- **Territory Coverage Effect**: Impact of being on user territory
- **Establishment Activity Correlation**: More active = better results
- **Policy Synergy**: Combined effect of multiple policies

### Descriptive Metrics

- **Geographic Concentration**: Top regions/departments
- **Housing Profile**: Typical characteristics of exiting housing
- **Timeline Patterns**: When housing typically exits vacancy
- **Transaction Patterns**: Role of property sales in vacancy exit

## 🚀 Usage Instructions

1. **Run analyses in order** (01-08) for logical flow
2. **Each file contains multiple queries** - run individually for specific charts
3. **Filter results** as needed for specific time periods or regions
4. **Combine results** across files for comprehensive dashboards
5. **Use comments in SQL** to understand chart requirements

## 📋 Next Steps

After running these analyses:

1. **Create visualizations** using your preferred BI tool
2. **Prepare executive summary** with key findings
3. **Design representative panel** based on characteristic distributions
4. **Document methodology** for reproducibility
5. **Schedule regular updates** to track ongoing impact

---

*These analyses provide comprehensive insights into housing vacancy exit patterns and ZLV's impact, supporting both strategic decision-making and research methodology.*

