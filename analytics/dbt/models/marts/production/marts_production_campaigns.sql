
SELECT 
    CAST(pc.id as VARCHAR) as campaign_id,
    pc.*, 
    pcsnc.next_campaign_sent_at,
    pcsnc.time_to_next_campaign,
    pcs.housing_number as housing_number_in_campaign,
    pcs.return_count_3_months,
    pcs.return_rate_3_months,
    pcsnc.has_next_campaign_in_3_months,
    pcsnc.return_count_3_months_before_next_campaign,
    pcsnc.return_rate_3_months_before_next_campaign,
    pcs.return_count_6_months,
    pcs.return_rate_6_months,
    pcsnc.has_next_campaign_in_6_months,
    pcsnc.return_count_6_months_before_next_campaign,
    pcsnc.return_rate_6_months_before_next_campaign,
    pcs.return_count_9_months,
    pcs.return_rate_9_months,
    pcsnc.has_next_campaign_in_9_months,
    pcsnc.return_count_9_months_before_next_campaign,
    pcsnc.return_rate_9_months_before_next_campaign,
    pcs.return_count_36_months,
    pcs.return_rate_36_months,
    pcsnc.has_next_campaign_in_36_months,
    pcsnc.return_count_36_months_before_next_campaign,
    pcsnc.return_rate_36_months_before_next_campaign
FROM {{ref('int_production_campaigns')}} pc 
JOIN {{ ref('int_production_campaigns_stats') }} pcs ON pcs.id = pc.id
JOIN {{ ref('int_production_campaigns_stats_next_campaign') }} pcsnc ON pcsnc.id = pc.id