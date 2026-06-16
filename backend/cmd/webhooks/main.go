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
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read service account file: %w", err)
	}
	cfg, err := google.JWTConfigFromJSON(b, "https://www.googleapis.com/auth/googlehealth.webhooks")
	if err != nil {
		return nil, fmt.Errorf("parse service account: %w", err)
	}
	return cfg.TokenSource(ctx), nil
}

func create(ctx context.Context, cfg *config.Config, sub *webhooks.SubscriberManager, args []string) {
	fs := flag.NewFlagSet("create", flag.ExitOnError)
	endpoint := fs.String("endpoint", os.Getenv("WEBHOOK_ENDPOINT_URI"), "Webhook endpoint URI")
	secret := fs.String("secret", cfg.WebhookSecret, "Webhook verification secret")
	typesStr := fs.String("types", "", "Comma-separated data types (default: all supported webhook types)")
	if err := fs.Parse(args); err != nil {
		log.Fatalf("parse flags: %v", err)
	}

	if *endpoint == "" {
		log.Fatal("-endpoint is required")
	}

	dataTypes := webhooksSupportedTypes()
	if *typesStr != "" {
		dataTypes = strings.Split(*typesStr, ",")
	}

	req := &webhooks.SubscriberConfig{
		EndpointURI:           *endpoint,
		EndpointAuthorization: webhooks.EndpointAuth{Secret: *secret},
		SubscriberConfigs: []webhooks.DataTypeConfig{
			{
				DataTypes:                dataTypes,
				SubscriptionCreatePolicy: "AUTOMATIC",
			},
		},
	}

	created, err := sub.CreateSubscriber(ctx, req)
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
	return []string{
		"active-energy-burned",
		"active-minutes",
		"active-zone-minutes",
		"blood-glucose",
		"blood-pressure",
		"body-fat",
		"calories-in-heart-rate-zone",
		"cervical-mucus",
		"cycling-pedaling-cadence",
		"distance",
		"elevation-gained",
		"exercise",
		"floors",
		"heart-rate",
		"heart-rate-variability",
		"height",
		"hydration",
		"intermenstrual-bleeding",
		"menstruation",
		"nutrition",
		"nutrition-log",
		"oxygen-saturation",
		"power",
		"respiratory-rate",
		"resting-heart-rate",
		"sexual-activity",
		"sleep",
		"speed",
		"steps",
		"swim-lengths-data",
		"time-in-heart-rate-zone",
		"total-calories",
		"vo2-max",
		"weight",
		"wheelchair-pushes",
	}
}
