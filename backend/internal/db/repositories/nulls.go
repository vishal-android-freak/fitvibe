package repositories

import "database/sql"

// nullStr wraps s as a SQL NULL when empty, otherwise the string value. It
// captures the very common "store this optional text, NULL if blank" pattern.
func nullStr(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}

// nullPosFloat wraps f as a SQL NULL when non-positive, otherwise the value.
// Used for measurements (height, weight) where 0 means "not provided".
func nullPosFloat(f float64) sql.NullFloat64 {
	return sql.NullFloat64{Float64: f, Valid: f > 0}
}

// nullPosInt32 wraps n as a SQL NULL when non-positive, otherwise the value.
// Used for counts/measurements where 0 means "not provided" (age, stride).
func nullPosInt32(n int) sql.NullInt32 {
	return sql.NullInt32{Int32: int32(n), Valid: n > 0}
}
