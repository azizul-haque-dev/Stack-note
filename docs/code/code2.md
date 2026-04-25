
```javascript
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
}

enum LanguageCode {
  EN
  AR
}

enum LessonItemType {
  WORD
  SENTENCE
  PROMPT
}

enum ConversationSpeaker {
  LEARNER
  GUIDE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
  EXPIRED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  CANCELED
  VALIDATED
}

model User {
  id                String        @id @default(auto()) @map("_id") @db.ObjectId
  name              String
  email             String        @unique
  emailVerified     Boolean       @default(false)
  image             String?
  preferredLanguage LanguageCode?
  learningGoal      String?
  passwordHash      String?
  streakCount       Int           @default(0)
  xp                Int           @default(0)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  sessions           Session[]
  accounts           Account[]
  verificationTokens VerificationToken[]
  progress           UserProgress[]
  subscriptions      Subscription[]
  payments           Payment[]
  speakingAttempts   SpeakingAttempt[]

  @@index([emailVerified, preferredLanguage])
}



model VerificationToken {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  identifier String
  token      String   @unique
  type       String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  // FIXED: Added @db.ObjectId
  userId String? @db.ObjectId
  user   User?   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([identifier, type])
  @@index([userId, expiresAt])
}



model Lesson {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  slug            String   @unique
  title           String
  titleBn         String
  titleAr         String
  description     String
  level           String
  durationMinutes Int
  coverImageUrl   String
  orderIndex      Int
  isPremium       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items    LessonItem[]
  progress UserProgress[]

  @@index([orderIndex, level])
}

model LessonItem {
  id              String         @id @default(auto()) @map("_id") @db.ObjectId
  type            LessonItemType
  orderIndex      Int
  prompt          String?
  textBn          String
  textEn          String
  textAr          String
  exampleSentence String?
  audioUrl        String?

  // FIXED: Added @db.ObjectId
  lessonId String @db.ObjectId
  lesson   Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  speakingAttempts SpeakingAttempt[]

  @@index([lessonId, orderIndex])
}

model Conversation {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  slug          String   @unique
  title         String
  category      String
  level         String
  summary       String
  imageUrl      String
  durationLabel String
  isPremium     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  lines            ConversationLine[]
  progress         UserProgress[]
  speakingAttempts SpeakingAttempt[]

  @@index([category, level])
}

model ConversationLine {
  id           String              @id @default(auto()) @map("_id") @db.ObjectId
  orderIndex   Int
  speaker      ConversationSpeaker
  speakerLabel String
  textBn       String
  textEn       String
  textAr       String
  audioUrl     String?

  // FIXED: Added @db.ObjectId
  conversationId String       @db.ObjectId
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, orderIndex])
}

model Flashcard {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  slug            String   @unique
  category        String
  imageUrl        String
  wordBn          String
  wordEn          String
  wordAr          String
  exampleSentence String
  audioUrl        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
}

model UserProgress {
  id                  String    @id @default(auto()) @map("_id") @db.ObjectId
  completed           Boolean   @default(false)
  completedAt         DateTime?
  streakSnapshot      Int       @default(0)
  xpEarned            Int       @default(0)
  currentLessonItem   Int       @default(0)
  currentConversation Int       @default(0)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // FIXED: Added @db.ObjectId to all foreign keys
  userId         String  @db.ObjectId
  lessonId       String? @db.ObjectId
  conversationId String? @db.ObjectId

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson       Lesson?       @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  conversation Conversation? @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@index([userId, completed, updatedAt])
  @@index([lessonId])
  @@index([conversationId])
}

model Subscription {
  id           String             @id @default(auto()) @map("_id") @db.ObjectId
  planCode     String
  status       SubscriptionStatus @default(TRIALING)
  billingCycle String             @default("monthly")
  amount       Float
  currency     String             @default("BDT")
  startedAt    DateTime           @default(now())
  renewsAt     DateTime?
  canceledAt   DateTime?
  sslSessionId String?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  // FIXED: Added @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  payments Payment[]

  @@index([userId, status])
}

model Payment {
  id             String        @id @default(auto()) @map("_id") @db.ObjectId
  transactionId  String        @unique
  amount         Float
  currency       String        @default("BDT")
  status         PaymentStatus @default(PENDING)
  gatewayStatus  String?
  gatewayPayload Json?
  validatedAt    DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  // FIXED: Added @db.ObjectId
  userId         String  @db.ObjectId
  subscriptionId String? @db.ObjectId

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  @@index([userId, status, createdAt])
  @@index([subscriptionId])
}

model SpeakingAttempt {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  audioUrl   String
  transcript String?
  durationMs Int?
  createdAt  DateTime @default(now())

  // FIXED: Added @db.ObjectId to all foreign keys
  userId         String  @db.ObjectId
  lessonItemId   String? @db.ObjectId
  conversationId String? @db.ObjectId

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonItem   LessonItem?   @relation(fields: [lessonItemId], references: [id], onDelete: SetNull)
  conversation Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([lessonItemId])
  @@index([conversationId])
}
```