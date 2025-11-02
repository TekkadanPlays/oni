package logging

import (
	"path/filepath"

	"github.com/TekkadanPlays/oni/config"
)

// GetTranscoderLogFilePath returns the logging path for the transcoder log output.
func GetTranscoderLogFilePath() string {
	return filepath.Join(config.LogDirectory, "transcoder.log")
}

func getLogFilePath() string {
	return filepath.Join(config.LogDirectory, "oni.log")
}
