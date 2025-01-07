{ % macro process_return_rate_for_campaigns (n_month,
check_next_campaign = False) % }
MAX (CASE
WHEN next_pc.next_sent_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
THEN 1
ELSE 0
END) AS has_next_campaign_ {{ n_month }} _months,
-- Define the returned count for each month interval
COUNT (DISTINCT CASE
WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
AND e.event_status_label = 'Suivi terminé'
{ % if check_next_campaign % }
AND (next_pc.next_sent_at IS NULL OR e.created_at < next_pc.next_sent_at)
{ % endif % }
THEN pch.housing_id
END) AS returned_count_ {{ n_month }} _months { % if not check_next_campaign % } _no_filter { % endif % },

-- Define the return rate calculation
(COUNT (DISTINCT CASE
WHEN e.created_at < (pc.sent_at + INTERVAL '{{ n_month }} months')
AND e.event_status_label = 'Suivi terminé'
{ % if check_next_campaign % }
AND (next_pc.next_sent_at IS NULL OR e.created_at < next_pc.next_sent_at)
{ % endif % }
THEN pch.housing_id
END) * 100.0 / NULLIF (COUNT (DISTINCT h.id),
0)) AS return_rate_ {{ n_month }} { % if not check_next_campaign % } _no_filter { % endif % }
{ % endmacro % }
