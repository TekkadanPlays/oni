package handlers

import (
	"net/http"

	"github.com/TekkadanPlays/oni/static"
)

var staticServer = http.FileServer(http.FS(static.GetWeb()))

// serveWeb will serve web assets.
func serveWeb(w http.ResponseWriter, r *http.Request) {
	staticServer.ServeHTTP(w, r)
}
