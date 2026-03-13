class TFLiteGestureClassifier:
    def __init__(self):
        self._interpreter = None

    def initialize(self) -> None:
        if self._interpreter is not None:
            return
        try:
            from tflite_runtime.interpreter import Interpreter
        except Exception:
            Interpreter = None

        if Interpreter is None:
            self._interpreter = None
            return

        # Model path can be configured later; for now keep classifier optional.
        self._interpreter = None

    def classify(self, landmarks):
        # Placeholder. Tests can monkeypatch this.
        # Expected input: list of hands, where each hand is a list of 21 {x,y,z} points.
        return None, 0.0
