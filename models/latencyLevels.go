package models

// LatencyLevel is a representation of HLS configuration values.
type LatencyLevel struct {
	Level             int `json:"level"`
	SecondsPerSegment int `json:"-"`
	SegmentCount      int `json:"-"`
}

// GetLatencyConfigs will return the available latency level options.
func GetLatencyConfigs() map[int]LatencyLevel {
	// Segment counts increased for resilience on low-resource servers.
	// More segments in the playlist = more buffer for clients to absorb
	// momentary I/O or CPU spikes without stalling.
	return map[int]LatencyLevel{
		0: {Level: 0, SecondsPerSegment: 1, SegmentCount: 30}, // Low latency ~5s, deep buffer
		1: {Level: 1, SecondsPerSegment: 2, SegmentCount: 18}, // ~8-10s latency
		2: {Level: 2, SecondsPerSegment: 3, SegmentCount: 12}, // Default ~10-12s latency
		3: {Level: 3, SecondsPerSegment: 4, SegmentCount: 10}, // ~15-18s latency
		4: {Level: 4, SecondsPerSegment: 5, SegmentCount: 7},  // High latency ~20-25s, max resilience
	}
}

// GetLatencyLevel will return the latency level at index.
func GetLatencyLevel(index int) LatencyLevel {
	return GetLatencyConfigs()[index]
}
