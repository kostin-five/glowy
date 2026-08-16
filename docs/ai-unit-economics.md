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

## Приватность и эксплуатация

- Не добавляйте prompt/response в эту таблицу или логи.
- Обновляйте ставки только через environment и после проверки единиц измерения.
- Не меняйте лимиты Start/Focus по единичному дню; сначала соберите устойчивую
  выборку по активным пользователям и пиковым сценариям.
- Глубокий разбор недели списывает 5 единиц дневного AI-лимита, месяца — 10;
  запуск доступен только Focus и Founder и всегда требует явного нажатия.
