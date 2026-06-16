package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/webhooks"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	if cfg.GoogleProjectNumber == "" {
		log.Fatal("GOOGLE_PROJECT_NUMBER is required")
	}

	if len(os.Args) < 2 {
		usage()
	}

	serviceAccountPath := os.Getenv("SERVICE_ACCOUNT_FILE")
	if serviceAccountPath == "" {
		serviceAccountPath = "service-account.json"
	}

	tokenSource, err := tokenSourceFromServiceAccount(ctx, serviceAccountPath)
	if err != nil {
		log.Fatalf("service account: %v", err)
	}

	sub := webhooks.NewSubscriberManager(cfg, func(ctx context.Context) (string, error) {
		tok, err := tokenSource.Token()
		if err != nil {
			return "", err
		}
		return tok.AccessToken, nil
	})

	switch os.Args[1] {
	case "create":
		create(ctx, cfg, sub, os.Args[2:])
	case "list":
		list(ctx, sub, os.Args[2:])
	case "delete":
		deleteSub(ctx, sub, os.Args[2:])
	default:
		usage()
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "Usage: %s <create|list|delete> [flags]\n", os.Args[0])
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Environment:")
	fmt.Fprintln(os.Stderr, "  SERVICE_ACCOUNT_FILE   Path to Google service account JSON (default: service-account.json)")
	fmt.Fprintln(os.Stderr, "  GOOGLE_PROJECT_NUMBER  Project number from config")
	fmt.Fprintln(os.Stderr, "  WEBHOOK_SECRET         Secret Google sends in webhooks")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Examples:")
	fmt.Fprintf(os.Stderr, "  %s create -endpoint https://fitvibe.naarang.com/webhooks/google-health -types heart-rate,steps\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s list\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s delete -name projects/123/subscribers/abc\n", os.Args[0])
	os.Exit(1)
}

func tokenSourceFromServiceAccount(ctx context.Context, path string) (oauth2.TokenSource, error) {
	// Set ADC path so google.FindDefaultCredentials can use the service account.
	if os.Getenv("GOOGLE_APPLICATION_CREDENTIALS") == "" {
		os.Setenv("GOOGLE_APPLICATION_CREDENTIALS", path)
	}
	creds, err := google.FindDefaultCredentials(ctx, "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return nil, fmt.Errorf("find default credentials: %w", err)
	}
	return creds.TokenSource, nil
}

func create(ctx context.Context, cfg *config.Config, sub *webhooks.SubscriberManager, args []string) {
	fs := flag.NewFlagSet("create", flag.ExitOnError)
	endpoint := fs.String("endpoint", os.Getenv("WEBHOOK_ENDPOINT_URI"), "Webhook endpoint URI")
	secret := fs.String("secret", cfg.WebhookSecret, "Webhook verification secret")
	typesStr := fs.String("types", "", "Comma-separated data types (default: all supported webhook types)")
	subscriberID := fs.String("subscriber-id", "fitvibe-webhook", "Unique subscriber ID (4-36 chars, lowercase)")
	if err := fs.Parse(args); err != nil {
		log.Fatalf("parse flags: %v", err)
	}

	if *endpoint == "" {
		log.Fatal("-endpoint is required")
	}
	if *subscriberID == "" {
		log.Fatal("-subscriber-id is required")
	}

	dataTypes := webhooksSupportedTypes()
	if *typesStr != "" {
		dataTypes = strings.Split(*typesStr, ",")
	}

	authSecret := *secret
	if authSecret != "" && !strings.HasPrefix(authSecret, "Bearer ") && !strings.HasPrefix(authSecret, "Basic ") {
		authSecret = "Bearer " + authSecret
	}

	req := &webhooks.SubscriberConfig{
		EndpointURI:           *endpoint,
		EndpointAuthorization: webhooks.EndpointAuth{Secret: authSecret},
		SubscriberConfigs: []webhooks.DataTypeConfig{
			{
				DataTypes:                dataTypes,
				SubscriptionCreatePolicy: "AUTOMATIC",
			},
		},
	}

	created, err := sub.CreateSubscriber(ctx, *subscriberID, req)
	if err != nil {
		log.Fatalf("create subscriber: %v", err)
	}

	printJSON(created)
}

func list(ctx context.Context, sub *webhooks.SubscriberManager, args []string) {
	fs := flag.NewFlagSet("list", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		log.Fatalf("parse flags: %v", err)
	}

	resp, err := sub.ListSubscribers(ctx)
	if err != nil {
		log.Fatalf("list subscribers: %v", err)
	}

	printJSON(resp)
}

func deleteSub(ctx context.Context, sub *webhooks.SubscriberManager, args []string) {
	fs := flag.NewFlagSet("delete", flag.ExitOnError)
	name := fs.String("name", "", "Subscriber resource name")
	if err := fs.Parse(args); err != nil {
		log.Fatalf("parse flags: %v", err)
	}

	if *name == "" {
		log.Fatal("-name is required")
	}

	if err := sub.DeleteSubscriber(ctx, *name); err != nil {
		log.Fatalf("delete subscriber: %v", err)
	}

	fmt.Println("deleted")
}

func printJSON(v interface{}) {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		log.Fatalf("marshal json: %v", err)
	}
	fmt.Println(string(b))
}

func webhooksSupportedTypes() []string {
	// Matches the webhook-supported data types listed in the Google Health API docs.
	return []string{
		"active-zone-minutes",
		"activity-level",
		"altitude",
		"blood-glucose",
		"body-fat",
		"calories-in-heart-rate-zone",
		"daily-heart-rate-variability",
		"daily-heart-rate-zones",
		"daily-oxygen-saturation",
		"daily-respiratory-rate",
		"daily-resting-heart-rate",
		"daily-sleep-temperature-derivations",
		"distance",
		"exercise",
		"floors",
		"heart-rate",
		"heart-rate-variability",
		"height",
		"hydration-log",
		"nutrition-log",
		"respiratory-rate-sleep-summary",
		"run-vo2-max",
		"sedentary-period",
		"sleep",
		"steps",
		"time-in-heart-rate-zone",
		"weight",
	}
}
