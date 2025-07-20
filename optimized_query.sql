-- Optimized version of the unread discussions query
-- Separates the OR logic into two UNION queries for better performance
SELECT project,
    SUM(unread_count) as unread_count
FROM (
        -- Case 1: Projects with mark_all_read_at timestamp
        -- Check if discussion's last_post_at is after the project's mark_all_read_at
        SELECT gd.project,
            COUNT(gd.name) as unread_count
        FROM `tabGP Discussion` gd
            INNER JOIN `tabGP Project Visit` gpv ON gd.project = gpv.project
            AND gpv.user = 'faris@erpnext.com'
            AND gpv.mark_all_read_at IS NOT NULL
        WHERE gd.last_post_at > gpv.mark_all_read_at
        GROUP BY gd.project
        UNION ALL
        -- Case 2: Projects without mark_all_read_at (or NULL)
        -- Fall back to individual discussion visit tracking
        SELECT gd.project,
            COUNT(gd.name) as unread_count
        FROM `tabGP Discussion` gd
            LEFT JOIN `tabGP Project Visit` gpv ON gd.project = gpv.project
            AND gpv.user = 'faris@erpnext.com'
            LEFT JOIN `tabGP Discussion Visit` gdv ON gd.name = gdv.discussion
            AND gdv.user = 'faris@erpnext.com'
        WHERE (
                gpv.name IS NULL
                OR gpv.mark_all_read_at IS NULL
            )
            AND (
                gdv.name IS NULL
                OR gd.last_post_at > gdv.last_visit
            )
        GROUP BY gd.project
    ) combined
GROUP BY project
ORDER BY project ASC;