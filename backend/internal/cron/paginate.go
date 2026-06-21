package cron

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"github.com/vishal-android-freak/fitvibe/internal/ingestion"
)

// page is one page of a paginated data-point fetch: the points and the token for
// the next page ("" when there are no more).
type page struct {
	points []healthapi.DataPoint
	next   string
}

// paginateAndStore drives the fetch→map→insert loop shared by the list, catchup,
// and reconcile syncers. fetch returns one page for the given page token; each
// page's points are mapped (tagged with source) and batch-inserted. It loops
// until fetch reports no next token.
func paginateAndStore(
	ctx context.Context,
	repo *repositories.DataPointRepo,
	userID int64,
	dataType, source string,
	fetch func(pageToken string) (page, error),
) error {
	pageToken := ""
	for {
		p, err := fetch(pageToken)
		if err != nil {
			return err
		}

		recs := make([]*repositories.DataPointRecord, 0, len(p.points))
		for i := range p.points {
			rec, err := ingestion.MapDataPoint(userID, dataType, source, &p.points[i], sql.NullInt64{})
			if err != nil {
				return fmt.Errorf("map data point: %w", err)
			}
			recs = append(recs, rec)
		}
		if len(recs) > 0 {
			if err := repo.InsertMany(ctx, recs); err != nil {
				return fmt.Errorf("insert data points: %w", err)
			}
		}

		if p.next == "" {
			return nil
		}
		pageToken = p.next
	}
}
