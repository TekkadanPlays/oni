package config

import (
	"time"

	"github.com/TekkadanPlays/oni/models"
	"github.com/TekkadanPlays/oni/webserver/handlers/generated"
)

// Defaults will hold default configuration values.
type Defaults struct {
	PageBodyContent string

	FederationGoLiveMessage string

	Summary              string
	ServerWelcomeMessage string
	Logo                 string
	YPServer             string

	Title string

	DatabaseFilePath string

	FederationUsername string
	WebServerIP        string
	Name               string
	AdminPassword      string
	StreamKeys         []generated.StreamKey

	StreamVariants []models.StreamOutputVariant

	Tags               []string
	RTMPServerPort     int
	SegmentsInPlaylist int

	SegmentLengthSeconds int
	WebServerPort        int

	ChatEstablishedUserModeTimeDuration time.Duration

	YPEnabled bool
}

// GetDefaults will return default configuration values.
func GetDefaults() Defaults {
	defaultStreamKey := "abc123"
	defaultStreamKeyComment := "Default stream key"
	return Defaults{
		Name:                 "New Oni Server",
		Summary:              "This is a new live video streaming server powered by Oni.",
		ServerWelcomeMessage: "",
		Logo:                 "logo.svg",
		AdminPassword:        "abc123",
		StreamKeys: []generated.StreamKey{
			{Key: &defaultStreamKey, Comment: &defaultStreamKeyComment},
		},
		Tags: []string{
			"oni",
			"streaming",
			"nostr",
		},

		PageBodyContent: `
# Welcome to Oni!

- This is a live stream powered by [Oni](https://github.com/TekkadanPlays/oni), a self-hosted live streaming server with Nostr integration.

- Oni is a fork of [Owncast](https://owncast.online) that adds decentralized authentication and live event broadcasting via the Nostr protocol.

- If you're the owner of this server you should visit the admin and customize the content on this page.

<hr/>
	`,

		DatabaseFilePath: "data/oni.db",

		YPEnabled: false,
		YPServer:  "https://owncast.directory",

		WebServerPort:  8080,
		WebServerIP:    "0.0.0.0",
		RTMPServerPort: 1935,

		ChatEstablishedUserModeTimeDuration: time.Minute * 15,

		StreamVariants: []models.StreamOutputVariant{
			{
				IsAudioPassthrough: true,
				VideoBitrate:       2500,
				Framerate:          30,
				ScaledHeight:       720,
				CPUUsageLevel:      2,
			},
			{
				IsAudioPassthrough: true,
				VideoBitrate:       1000,
				Framerate:          30,
				ScaledHeight:       480,
				CPUUsageLevel:      1,
			},
		},

		FederationUsername:      "streamer",
		FederationGoLiveMessage: "I've gone live!",
	}
}
