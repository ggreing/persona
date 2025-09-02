import pika
from pika.adapters.blocking_connection import BlockingChannel
from typing import Callable, Optional
import threading
import time

# TODO: .env 또는 config 파일로 이동
RABBITMQ_HOST = "localhost"
RABBITMQ_USER = "user"
RABBITMQ_PASS = "password"

class MessagingService:
    """
    RabbitMQ 메시지 큐와의 상호작용을 관리하는 서비스.
    메시지 발행(Publish) 및 구독(Consume)을 담당합니다.
    """
    def __init__(self):
        self.connection = None
        self.channel = None
        self.credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
        self.parameters = pika.ConnectionParameters(RABBITMQ_HOST, credentials=self.credentials)
        self._connect()

    def _connect(self):
        """RabbitMQ에 연결하고 채널을 엽니다."""
        try:
            self.connection = pika.BlockingConnection(self.parameters)
            self.channel = self.connection.channel()
            print("RabbitMQ에 성공적으로 연결되었습니다.")
        except pika.exceptions.AMQPConnectionError as e:
            print(f"RabbitMQ 연결 실패: {e}. 5초 후 재시도합니다...")
            time.sleep(5)
            self._connect()

    def _get_channel(self) -> Optional[BlockingChannel]:
        """
        안정적인 채널 객체를 반환합니다. 연결이 끊겼으면 재연결을 시도합니다.
        """
        if not self.connection or self.connection.is_closed:
            print("RabbitMQ 연결이 끊겼습니다. 재연결을 시도합니다.")
            self._connect()
        return self.channel

    def publish_message(self, queue_name: str, message: str):
        """
        지정된 큐에 메시지를 발행합니다.

        Args:
            queue_name (str): 메시지를 보낼 큐의 이름.
            message (str): 보낼 메시지 (문자열 형태).
        """
        channel = self._get_channel()
        if not channel:
            print("메시지 발행 실패: 채널을 사용할 수 없습니다.")
            return

        try:
            # 큐가 없으면 생성 (durable=True는 RabbitMQ가 재시작되어도 큐를 유지)
            channel.queue_declare(queue=queue_name, durable=True)

            channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message.encode('utf-8'),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # 메시지를 영속적으로 만듦
                ))
            print(f"'{queue_name}' 큐에 메시지를 발행했습니다: '{message}'")
        except Exception as e:
            print(f"메시지 발행 중 오류 발생: {e}")

    def start_consuming(self, queue_name: str, callback: Callable[[BlockingChannel, Any, Any, bytes], None]):
        """
        지정된 큐의 메시지를 구독(consume)하기 시작합니다.
        이 메서드는 블로킹(blocking)되므로 별도의 스레드에서 실행해야 합니다.

        Args:
            queue_name (str): 구독할 큐의 이름.
            callback (Callable): 메시지를 수신했을 때 실행할 콜백 함수.
        """
        channel = self._get_channel()
        if not channel:
            print("구독 시작 실패: 채널을 사용할 수 없습니다.")
            return

        try:
            channel.queue_declare(queue=queue_name, durable=True)
            # 한 번에 하나의 메시지만 처리하도록 설정 (공정한 분배)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue_name, on_message_callback=callback)

            print(f"'{queue_name}' 큐에서 메시지 구독을 시작합니다. 중지하려면 Ctrl+C를 누르세요.")
            channel.start_consuming()
        except Exception as e:
            print(f"메시지 구독 중 오류 발생: {e}")

    def run_consumer_in_thread(self, queue_name: str, callback: Callable):
        """
        별도의 스레드에서 컨슈머를 실행하여 메인 스레드를 블로킹하지 않도록 합니다.
        """
        consumer_thread = threading.Thread(
            target=self.start_consuming,
            args=(queue_name, callback),
            daemon=True # 메인 스레드 종료 시 함께 종료
        )
        consumer_thread.start()
        print(f"'{queue_name}' 큐의 컨슈머가 별도 스레드에서 실행됩니다.")
        return consumer_thread

# 서비스 인스턴스 생성
messaging_service = MessagingService()
