# Multi-stage: compile Go → distroless static (non-root)
FROM golang:1.26-alpine AS build

ENV GOTOOLCHAIN=auto
RUN apk add --no-cache git ca-certificates
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /crypto-service .

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /crypto-service /crypto-service

ENV CRYPTO_PORT=4081
EXPOSE 4081

USER nonroot:nonroot
ENTRYPOINT ["/crypto-service"]
