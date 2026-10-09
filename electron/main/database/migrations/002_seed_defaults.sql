INSERT OR IGNORE INTO subscription_prices (duration_months, label, price)
VALUES
    (1, '1 Month', 3500),
    (2, '2 Months', 6500),
    (3, '3 Months', 9000),
    (6, '6 Months', 17000),
    (12, '1 Year', 32000);

INSERT OR IGNORE INTO app_settings (key, value)
VALUES
    ('gym_name', 'SHAWISH Gym'),
    ('phone', ''),
    ('address', ''),
    ('currency', 'EGP'),
    ('timezone', 'Africa/Cairo');
