SELECT 'n_document' AS t, COUNT(*) AS n FROM dbo.n_document
UNION ALL SELECT 'n_concept', COUNT(*) FROM dbo.n_concept
UNION ALL SELECT 'n_person', COUNT(*) FROM dbo.n_person
UNION ALL SELECT 'n_claim', COUNT(*) FROM dbo.n_claim
UNION ALL SELECT 'n_bucket', COUNT(*) FROM dbo.n_bucket
UNION ALL SELECT 'e_about', COUNT(*) FROM dbo.e_about
UNION ALL SELECT 'e_explains', COUNT(*) FROM dbo.e_explains
UNION ALL SELECT 'e_mentions', COUNT(*) FROM dbo.e_mentions
UNION ALL SELECT 'e_speaks_in', COUNT(*) FROM dbo.e_speaks_in
UNION ALL SELECT 'e_in_bucket', COUNT(*) FROM dbo.e_in_bucket
UNION ALL SELECT 'e_relates_to', COUNT(*) FROM dbo.e_relates_to
UNION ALL SELECT 'e_mentions_person', COUNT(*) FROM dbo.e_mentions_person
UNION ALL SELECT 'segments', COUNT(*) FROM dbo.segments
