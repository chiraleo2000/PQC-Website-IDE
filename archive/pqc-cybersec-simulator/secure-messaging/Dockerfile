FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy parent pom and all module poms first for dependency resolution
COPY pom.xml .
COPY crypto-lib/pom.xml crypto-lib/
COPY gov-portal/pom.xml gov-portal/
COPY secure-messaging/pom.xml secure-messaging/
COPY hacker-console/pom.xml hacker-console/

# Create dummy directories for modules we don't need
RUN mkdir -p gov-portal/src/main/java hacker-console/src/main/java && \
    touch gov-portal/src/main/java/.gitkeep hacker-console/src/main/java/.gitkeep

# Copy crypto library source
COPY crypto-lib/src crypto-lib/src

# Install parent pom and crypto library
RUN mvn install -N -DskipTests -q && \
    mvn install -pl crypto-lib -DskipTests -q

# Copy secure-messaging source
COPY secure-messaging/src secure-messaging/src

# Build secure-messaging with Spring Boot repackage
RUN mvn package spring-boot:repackage -pl secure-messaging -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/secure-messaging/target/*.jar app.jar
EXPOSE 8182
ENTRYPOINT ["java", "-jar", "app.jar"]
