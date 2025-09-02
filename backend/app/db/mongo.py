import motor.motor_asyncio
from contextlib import asynccontextmanager

MONGO_DETAILS = "mongodb://localhost:27017"
DATABASE_NAME = "sales_persona_db"

class Database:
    def __init__(self):
        self.client = None
        self.db = None

    async def connect(self):
        """
        Connect to MongoDB and initialize the database object.
        """
        print("Connecting to MongoDB...")
        self.client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)
        self.db = self.client[DATABASE_NAME]
        print("Successfully connected to MongoDB.")

    async def disconnect(self):
        """
        Disconnect from MongoDB.
        """
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB.")

    @asynccontextmanager
    async def get_session(self):
        """
        Provide a database session.
        """
        if self.db is None:
            await self.connect()
        try:
            yield self.db
        finally:
            pass  # The connection is managed externally

db = Database()

async def get_database():
    """
    Dependency for FastAPI to get the database instance.
    """
    if db.db is None:
        await db.connect()
    return db.db
