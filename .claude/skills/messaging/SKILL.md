---
name: messaging
description: Design message queues and event-driven architecture — RabbitMQ, Kafka, Redis Pub/Sub, and AWS SQS.
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "<broker type or messaging pattern>"
---

# Messaging & Event-Driven Architecture

---

## Message Broker Comparison

| Broker | Best For | Throughput | Ordering |
|--------|----------|------------|----------|
| RabbitMQ | Task queues, RPC | Medium | Per queue |
| Kafka | Event streaming, logs | Very high | Per partition |
| Redis Pub/Sub | Real-time, simple | High | None |
| SQS | AWS serverless | Medium | FIFO optional |

---

## RabbitMQ Producer/Consumer

```python
import pika
import json

# Producer
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue='orders', durable=True)

def publish_order(order):
    channel.basic_publish(
        exchange='',
        routing_key='orders',
        body=json.dumps(order),
        properties=pika.BasicProperties(delivery_mode=2)  # persistent
    )

# Consumer
def process_order(ch, method, properties, body):
    order = json.loads(body)
    print(f"Processing order: {order['id']}")
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='orders', on_message_callback=process_order)
channel.start_consuming()
```

## Kafka Event Streaming

```python
from kafka import KafkaProducer, KafkaConsumer
import json

# Producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

producer.send('user-events', {'type': 'USER_CREATED', 'user_id': '123'})

# Consumer
consumer = KafkaConsumer(
    'user-events',
    bootstrap_servers=['localhost:9092'],
    group_id='notification-service',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    print(f"Event: {message.value}")
```

---

## Patterns

### Dead Letter Queue (DLQ)

```python
def process_with_retry(message, max_retries=3):
    retry_count = message.headers.get('x-retry-count', 0)

    try:
        process(message)
    except Exception as e:
        if retry_count < max_retries:
            republish_with_delay(message, retry_count + 1)
        else:
            publish_to_dlq(message, str(e))
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Message loss | No persistence | Enable durable queues |
| Consumer lag | Slow processing | Scale consumers, batch processing |
| Duplicate processing | No idempotency | Implement idempotent consumers |

---

## When to Load References

- Load `references/GUIDE.md` when: Setting up a broker for the first time, connection configuration, security setup
- Load `references/PATTERNS.md` when: Designing message flow, choosing between patterns (pub/sub vs queue vs stream), implementing sagas
- Load `assets/schema.json` when: Validating message schemas or understanding message envelope structure
- Load `assets/config.yaml` when: Reviewing broker configuration templates
- Run `scripts/validate.py` when: Validating message payloads against schema before publishing
