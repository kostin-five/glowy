# AI unit economics

Glowy хранит только дневные агрегаты успешных авторизованных AI-запросов:
тариф, провайдер, модель, число запросов и токенов, а также расчётную стоимость.
Тексты сообщений, ответы AI, названия задач и привычек в эту таблицу не
записываются.

## Настройка стоимости

В backend environment задаются цены провайдера за миллион входных и выходных
токенов в USD:

```env
AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD=
AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_INPUT_PER_MILLION_USD=
AI_COST_GIGACHAT_OUTPUT_PER_MILLION_USD=
```

Пустая или некорректная ставка не превращается в нулевую стоимость. Такой
запрос увеличивает `requests`, но не `priced_requests`. Денежное значение
хранится целым числом microUSD: `1 USD = 1 000 000 microUSD`.

## Отчёт по тарифам

Запрос только читает агрегаты и не содержит пользовательского текста:

```sql
SELECT
  usage_date,
  plan,
  provider,
  model,
  SUM(requests) AS requests,
  SUM(tokenized_requests) AS tokenized_requests,
  SUM(priced_requests) AS priced_requests,
  SUM(total_tokens) AS total_tokens,
  SUM(estimated_cost_microusd) AS estimated_cost_microusd
FROM ai_usage_daily
WHERE usage_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY usage_date, plan, provider, model
ORDER BY usage_date DESC, plan, provider, model;
```

Для расчёта средней AI-себестоимости на активного пользователя используйте
только строки, где все рассматриваемые запросы имеют цену, либо отдельно
показывайте долю `priced_requests / requests`. Смешивание известных и
неизвестных ставок занизит результат.

## Себестоимость запроса и пользователя-дня

`estimated_cost_microusd / priced_requests` — средняя оценочная себестоимость
одного запроса, для которого известна ставка. Рядом всегда показывайте покрытие
`priced_requests / requests`: без него среднее может выглядеть точнее, чем есть
на самом деле.

```sql
SELECT
  plan,
  provider,
  model,
  SUM(estimated_cost_microusd)::numeric
    / NULLIF(SUM(priced_requests), 0) AS avg_cost_per_priced_request_microusd,
  SUM(priced_requests)::numeric
    / NULLIF(SUM(requests), 0) AS pricing_coverage,
  SUM(requests) AS requests
FROM ai_usage_daily
WHERE usage_date >= TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'YYYY-MM-DD')
GROUP BY plan, provider, model
ORDER BY plan, provider, model;
```

Пользователь-день — один пользователь, у которого в конкретную дату был хотя
бы один успешный AI-запрос. Внешний запрос ниже возвращает только агрегаты по
тарифу: `user_id` используется внутри CTE для корректной группировки и не
выводится в результат.

```sql
WITH user_days AS (
  SELECT
    user_id,
    usage_date,
    plan,
    SUM(requests) AS requests,
    SUM(priced_requests) AS priced_requests,
    SUM(estimated_cost_microusd) AS cost_microusd
  FROM ai_usage_daily
  WHERE usage_date >= TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'YYYY-MM-DD')
  GROUP BY user_id, usage_date, plan
)
SELECT
  plan,
  COUNT(*) AS active_user_days,
  AVG(requests) AS avg_requests_per_active_user_day,
  AVG(cost_microusd) AS avg_cost_per_active_user_day_microusd,
  SUM(cost_microusd)::numeric
    / NULLIF(SUM(priced_requests), 0) AS avg_cost_per_priced_request_microusd
FROM user_days
GROUP BY plan
ORDER BY plan;
```

Это агрегированная оценка, а не бухгалтерская сумма провайдера. Точная история
каждого отдельного запроса намеренно не хранится; для решения о лимитах и цене
используется устойчивая выборка по дням, тарифам и покрытию ставок.

## Приватность и эксплуатация

- Не добавляйте prompt/response в эту таблицу или логи.
- Обновляйте ставки только через environment и после проверки единиц измерения.
- Не меняйте лимиты Start/Focus по единичному дню; сначала соберите устойчивую
  выборку по активным пользователям и пиковым сценариям.
- Глубокий разбор недели списывает 5 единиц дневного AI-лимита, месяца — 10;
  запуск доступен только Focus и Forever и всегда требует явного нажатия.
