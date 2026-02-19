"""
SQLAlchemy models based on Prisma schema
Using Int ID and separated User/Credential tables (Backend/website pattern)
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Boolean, Enum as SQLEnum, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enums matching Prisma schema
class UserRoleEnum(str, enum.Enum):
    user = "user"
    support = "support"
    admin_metrics = "admin_metrics"
    admin = "admin"

class UserApprovalStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class ChatUserRoleEnum(str, enum.Enum):
    member = "member"
    admin = "admin"
    owner = "owner"

class DocumentShareRoleEnum(str, enum.Enum):
    viewer = "viewer"
    editor = "editor"

# Junction table for many-to-many relationship between User and Chat
chat_users = Table(
    'ChatUser',
    Base.metadata,
    Column('chatId', Integer, ForeignKey('Chat.id', ondelete='CASCADE'), primary_key=True),
    Column('userId', Integer, ForeignKey('User.id', ondelete='CASCADE'), primary_key=True),
    Column('joinedAt', DateTime(timezone=True), server_default=func.now()),
    Column('role', SQLEnum(ChatUserRoleEnum), default=ChatUserRoleEnum.member)
)


class User(Base):
    """User model - User information and profile"""
    __tablename__ = "User"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    emailVerified = Column(Boolean, default=False, nullable=False)
    emailVerifiedAt = Column(DateTime(timezone=True), nullable=True)
    emailVerificationToken = Column(String, unique=True, nullable=True, index=True)
    emailVerificationExpiresAt = Column(DateTime(timezone=True), nullable=True)
    passwordResetToken = Column(String, unique=True, nullable=True, index=True)
    passwordResetExpiresAt = Column(DateTime(timezone=True), nullable=True)
    role = Column(SQLEnum(UserRoleEnum), default=UserRoleEnum.user, nullable=False, index=True)
    approvalStatus = Column(SQLEnum(UserApprovalStatusEnum), default=UserApprovalStatusEnum.pending, nullable=False, index=True)
    isActive = Column(Boolean, default=True, nullable=False)
    avatarUrl = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    credential = relationship("Credential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chats = relationship("Chat", secondary=chat_users, back_populates="users")
    messages = relationship("ChatMessage", back_populates="sender")
    bots = relationship("Bot", back_populates="owner", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    sharedDocuments = relationship("DocumentShare", back_populates="user", cascade="all, delete-orphan")


class Credential(Base):
    """Credential model - Authentication credentials (separated for security)"""
    __tablename__ = "Credential"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    password = Column(String, nullable=False)  # Hashed password
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="credential")


class Chat(Base):
    """Chat room model - supports multi-user"""
    __tablename__ = "Chat"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # Optional chat room name
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    lastUsed = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True)

    # Relationships
    users = relationship("User", secondary=chat_users, back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Message in a chat room"""
    __tablename__ = "ChatMessage"

    id = Column(Integer, primary_key=True, index=True)
    chatId = Column(Integer, ForeignKey("Chat.id", ondelete="CASCADE"), nullable=False, index=True)
    userId = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)  # Sender
    message = Column(String, nullable=False)
    isAiGenerated = Column(Boolean, default=False, nullable=False, index=True)  # Mark if message is AI generated
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="messages")


# Junction table for many-to-many relationship between Bot and Document
bot_documents = Table(
    'BotDocument',
    Base.metadata,
    Column('botId', Integer, ForeignKey('Bot.id', ondelete='CASCADE'), primary_key=True),
    Column('documentId', Integer, ForeignKey('Document.id', ondelete='CASCADE'), primary_key=True),
    Column('createdAt', DateTime(timezone=True), server_default=func.now())
)


class Bot(Base):
    """Bot model - AI bot configuration"""
    __tablename__ = "Bot"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    description = Column(String, nullable=True)
    model = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    ownerId = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    enabled = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="bots")
    documents = relationship("Document", secondary=bot_documents, back_populates="bots")


class Document(Base):
    """Document/Knowledge model - Knowledge base documents"""
    __tablename__ = "Document"

    id = Column(Integer, primary_key=True, index=True)
    displayName = Column(String, nullable=False)
    ragStoreName = Column(String, nullable=False)  # Qdrant collection name
    sourceFiles = Column(JSON, nullable=False)  # Array of file objects with text/blocks
    ownerId = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    tags = Column(JSON, default=[], nullable=False)  # Array of strings
    link = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="documents")
    bots = relationship("Bot", secondary=bot_documents, back_populates="documents")
    shares = relationship("DocumentShare", back_populates="document", cascade="all, delete-orphan")


class DocumentShare(Base):
    """Document sharing model - Share documents with other users"""
    __tablename__ = "DocumentShare"

    id = Column(Integer, primary_key=True, index=True)
    documentId = Column(Integer, ForeignKey("Document.id", ondelete="CASCADE"), nullable=False, index=True)
    userId = Column(Integer, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SQLEnum(DocumentShareRoleEnum), default=DocumentShareRoleEnum.viewer, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="shares")
    user = relationship("User", back_populates="sharedDocuments")
