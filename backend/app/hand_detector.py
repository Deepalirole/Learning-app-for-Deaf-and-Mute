class MediaPipeHandDetector:
    def __init__(self):
        self._hands = None

    def initialize(self) -> None:
        if self._hands is not None:
            return
        try:
            import mediapipe as mp

            self._mp = mp
            self._hands = mp.solutions.hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        except Exception:
            self._hands = None

    def extract_landmarks(self, rgb_image_array):
        if self._hands is None:
            return []

        results = self._hands.process(rgb_image_array)
        if not results.multi_hand_landmarks:
            return []

        hands = []
        for hand_landmarks in results.multi_hand_landmarks:
            points = []
            for lm in hand_landmarks.landmark:
                points.append({"x": float(lm.x), "y": float(lm.y), "z": float(lm.z)})
            if len(points) == 21:
                hands.append(points)

        return hands
