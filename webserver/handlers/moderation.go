package handlers

import (
	"net/http"

	"github.com/TekkadanPlays/oni/webserver/handlers/generated"
	"github.com/TekkadanPlays/oni/webserver/handlers/moderation"
	"github.com/TekkadanPlays/oni/webserver/router/middleware"
)

func (*ServerInterfaceImpl) GetUserDetails(w http.ResponseWriter, r *http.Request, userId string, params generated.GetUserDetailsParams) {
	middleware.RequireUserModerationScopeAccesstoken(moderation.GetUserDetails)(w, r)
}
