FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy parent pom and all module poms first for dependency resolution
COPY pom.xml .
COPY crypto-lib/pom.xml crypto-lib/
COPY gov-portal/pom.xml gov-portal/
COPY secure-messaging/pom.xml secure-messaging/
COPY hacker-console/pom.xml hacker-console/

# Create dummy directories for modules we don't need
RUN mkdir -p secure-messaging/src/main/java hacker-console/src/main/java && \
    touch secure-messaging/src/main/java/.gitkeep hacker-console/src/main/java/.gitkeep

# Copy crypto library source
COPY crypto-lib/src crypto-lib/src

# Install parent pom and crypto library
RUN mvn install -N -DskipTests -q && \
    mvn install -pl crypto-lib -DskipTests -q

# Copy gov-portal source
COPY gov-portal/src gov-portal/src

# Build gov-portal with Spring Boot repackage
RUN mvn package spring-boot:repackage -pl gov-portal -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/gov-portal/target/*.jar app.jar
EXPOSE 8181
ENTRYPOINT ["java", "-jar", "app.jar"]
