FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy parent pom and crypto library first
COPY pom.xml .
COPY crypto-lib/pom.xml crypto-lib/
COPY crypto-lib/src crypto-lib/src

# Install crypto library
RUN mvn install -pl crypto-lib -DskipTests -q

# Copy service
COPY hacker-console/pom.xml hacker-console/
COPY hacker-console/src hacker-console/src

# Build service
RUN mvn package -pl hacker-console -am -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/hacker-console/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
