package models

import "github.com/TekkadanPlays/oni/utils"

// Status represents the status of the system.
type Status struct {
	LastConnectTime    *utils.NullTime `json:"lastConnectTime"`
	LastDisconnectTime *utils.NullTime `json:"lastDisconnectTime"`

	VersionNumber         string `json:"versionNumber"`
	StreamTitle           string `json:"streamTitle"`
	ViewerCount           int    `json:"viewerCount"`
	OverallMaxViewerCount int    `json:"overallMaxViewerCount"`
	SessionMaxViewerCount int    `json:"sessionMaxViewerCount"`

	Online bool `json:"online"`
}
