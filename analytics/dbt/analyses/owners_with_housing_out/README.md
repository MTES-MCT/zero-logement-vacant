# Owner Analysis - Housing Out of Vacancy

This directory contains comprehensive SQL analyses to understand the characteristics of owners whose housing has exited vacancy. These analyses complement the housing analysis and provide insights into owner demographics, behavior patterns, and response to ZLV campaigns.

## 📊 Analysis Files Overview

### 1. Owner Demographics (`01_owner_demographics.sql`)

**Purpose**: Analyze demographic characteristics of owners with housing out of vacancy
**Charts needed**:

- Bar chart: Owner types and their housing exit rates
- Horizontal bar chart: Detailed owner categories
- Histogram: Age distribution and housing exit rates
- Bar chart: Administrator vs non-administrator status
- Bar chart: Entity types (for legal entities)
- Bar chart: Data sources effectiveness
- Timeline: Owner creation periods
- Heatmap: Combined owner profile characteristics

**Key insights**: Identifies which types of owners are most likely to have housing exit vacancy

### 2. Owner Location Analysis (`02_owner_location_analysis.sql`)

**Purpose**: Examine the relationship between owner location and housing location
**Charts needed**:

- Map/Bar chart: Geographic distribution of owners
- Scatter plot: Owner vs housing location proximity
- Bar chart: Local vs non-local owner comparison
- Horizontal bar chart: Top owner cities
- Heatmap: Cross-regional ownership patterns
- Line chart: Campaign effectiveness by proximity
- Bar chart: Address quality impact
- Bar chart: Multi-location owners analysis

**Key insights**: Understanding geographic patterns and proximity effects on vacancy exit

### 3. Owner Portfolio Analysis (`03_owner_portfolio_analysis.sql`)

**Purpose**: Analyze property ownership experience and portfolio characteristics
**Charts needed**:

- Histogram: Portfolio size distribution
- Stacked bar chart: Housing type diversity
- Scatter plot: Geographic diversification vs campaign effectiveness
- Box plot: Property value distributions by portfolio size
- Stacked bar chart: Building age diversity in portfolios
- Heatmap: Energy performance portfolio analysis
- Stacked bar chart: Vacancy duration patterns
- Table: Top portfolio owners characteristics

**Key insights**: How property ownership experience affects vacancy exit success

### 4. Owner Contact Analysis (`04_owner_contact_analysis.sql`)

**Purpose**: Analyze contact information availability and impact on campaigns
**Charts needed**:

- Stacked bar chart: Contact information completeness
- Bar chart: Email domain analysis
- Bar chart: Phone number patterns and effectiveness
- Bar chart: Additional address information impact
- Scatter plot: Contact quality score vs campaign effectiveness
- Heatmap: Contact availability by owner type
- Bar chart: Missing contact information impact
- Timeline: Contact information trends over time

**Key insights**: How contact information quality affects campaign success and housing exit rates

### 5. Owner Campaign Response Analysis (`05_owner_campaign_response_analysis.sql`)

**Purpose**: Analyze owner proactivity and response to ZLV campaigns
**Charts needed**:

- Bar chart: Response rates by owner demographics
- Line chart: Campaign intensity vs portfolio size
- Timeline: Campaign timeline and response patterns
- Heatmap: Campaign participation by owner location
- Scatter plot: Establishment activity vs owner response
- Bar chart: Multi-housing owner campaign coordination
- Histogram: Owner responsiveness score distribution
- Table: Top responsive owners characteristics

**Key insights**: Understanding owner engagement and response patterns to ZLV initiatives

## 🎯 Key Questions These Analyses Answer

### For Owner Profiling

1. **Demographics**: What types of owners are most successful at exiting vacancy?
2. **Geographic Patterns**: Does owner proximity to housing affect outcomes?
3. **Portfolio Experience**: Do experienced property owners perform better?
4. **Contact Quality**: How does contact information affect campaign success?
5. **Responsiveness**: Which owners are most engaged with ZLV campaigns?

### For Campaign Optimization

1. **Target Segments**: Which owner segments should be prioritized?
2. **Contact Strategy**: What contact methods work best for different owner types?
3. **Geographic Targeting**: Should campaigns focus on local vs distant owners?
4. **Portfolio Approach**: How to approach owners with multiple properties?
5. **Engagement Patterns**: When and how do owners typically respond?

### For Survey Panel Creation

1. **Representative Sampling**: What owner characteristics to include in the panel?
2. **Geographic Distribution**: Which regions/owner locations to represent?
3. **Experience Levels**: Mix of experienced vs novice property owners
4. **Contact Preferences**: Balance of different contact information availability
5. **Engagement Levels**: Include various levels of ZLV campaign participation

## 📈 Expected Chart Types and Visualizations

### High-Impact Charts for Investment Committee

1. **Owner Type Effectiveness**: Clear demonstration of which owner types succeed
2. **Geographic Proximity Impact**: Show local vs distant owner performance
3. **Portfolio Size Correlation**: Relationship between experience and success
4. **Contact Quality ROI**: Impact of better contact information on campaigns
5. **Responsiveness Patterns**: Owner engagement with ZLV initiatives

### Analytical Charts for Panel Creation

1. **Demographic Distribution Histograms**: For representative owner sampling
2. **Geographic Heatmaps**: Ensure geographic representation of owners
3. **Portfolio Characteristic Distributions**: Balance experience levels
4. **Contact Quality Distributions**: Ensure various contact scenarios
5. **Engagement Level Distributions**: Include different response patterns

## 🔍 Key Owner Metrics to Highlight

### Demographic Metrics

- **Owner Type Distribution**: Individual vs legal entity success rates
- **Age Patterns**: Age groups most likely to exit vacancy
- **Geographic Concentration**: Where successful owners are located
- **Portfolio Size Impact**: Experience correlation with success

### Behavioral Metrics

- **Campaign Participation**: Response rates to ZLV campaigns
- **Contact Quality Score**: Completeness of contact information
- **Responsiveness Score**: Engagement level with ZLV initiatives
- **Geographic Proximity**: Local vs distant ownership patterns

### Success Factors

- **Contact Completeness**: Email + phone vs partial contact info
- **Portfolio Diversity**: Single vs multi-property owners
- **Location Proximity**: Same city vs different region ownership
- **Campaign Engagement**: Active vs passive response to outreach

## 🚀 Usage Instructions

1. **Run analyses in sequence** (01-05) for comprehensive owner understanding
2. **Cross-reference with housing analyses** for complete picture
3. **Filter by specific owner segments** for targeted insights
4. **Combine results** for comprehensive owner profiling dashboards
5. **Use for panel design** to ensure representative owner sampling

## 📋 Owner Segmentation Insights

### High-Success Owner Profiles

- **Local Individual Owners**: Live in same city as property
- **Experienced Portfolio Owners**: Multiple properties, good contact info
- **Responsive Owners**: High engagement with ZLV campaigns
- **Complete Contact Info**: Email + phone + complete address

### Target Segments for Campaigns

- **New Property Owners**: Recent acquisitions, may need guidance
- **Multi-Property Owners**: Systematic approach across portfolio
- **Distant Owners**: May need additional support/information
- **Incomplete Contact**: Opportunity to improve outreach effectiveness

## 📊 Integration with Housing Analysis

These owner analyses should be combined with housing analyses to understand:

1. **Owner-Housing Combinations**: Which owner types succeed with which housing types
2. **Geographic Correlations**: Owner location vs housing location success patterns
3. **Campaign Effectiveness**: Owner characteristics that predict campaign success
4. **Portfolio Strategies**: How different owners manage different property types

## 🎯 Panel Creation Recommendations

Based on these analyses, the owner survey panel should include:

### Demographic Representation

- **Age Groups**: Balanced across age ranges (focus on 40-70 years)
- **Owner Types**: Mix of individuals and legal entities
- **Experience Levels**: New owners vs experienced portfolio owners

### Geographic Representation

- **Proximity Levels**: Local, departmental, and distant owners
- **Urban vs Rural**: Different geographic contexts
- **Regional Distribution**: Proportional to actual owner distribution

### Engagement Representation

- **Campaign Participation**: Mix of high, medium, and low engagement
- **Contact Quality**: Various levels of contact information completeness
- **Portfolio Sizes**: Single property to large portfolio owners

---

*These owner analyses provide crucial insights into the human factor behind housing vacancy exit, enabling better targeting, campaign optimization, and representative research panel creation.*
