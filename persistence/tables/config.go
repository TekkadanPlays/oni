package tables

import (
	"database/sql"

	"github.com/TekkadanPlays/oni/utils"
)

func CreateConfigTable(db *sql.DB) {
	createTableSQL := `CREATE TABLE IF NOT EXISTS datastore (
		"key" string NOT NULL PRIMARY KEY,
		"value" BLOB,
		"timestamp" DATE DEFAULT CURRENT_TIMESTAMP NOT NULL
	);`

	utils.MustExec(createTableSQL, db)
}
