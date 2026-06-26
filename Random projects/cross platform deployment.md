# Probability in Machine Learning

## Introduction
Probability is the foundation of Machine Learning. Most ML algorithms rely on probabilistic reasoning to make predictions, handle uncertainty, and learn from data.

## Basic Concepts

### 1. Probability Basics
- **Random Variable**: A variable whose possible values are outcomes of a random phenomenon.
- **Probability of an Event**:
  $$
  P(A) = \frac{\text{Number of favorable outcomes}}{\text{Total number of possible outcomes}}
  $$

### 2. Conditional Probability
$$
P(A|B) = \frac{P(A \cap B)}{P(B)}
$$

### 3. Bayes' Theorem
$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

**Medical Test Example**:
- $P(D) = 0.01$, $P(+|D) = 0.95$, $P(+|\neg D) = 0.05$
- $P(D|+) \approx 0.161$ (16.1%)

## Bayesian Neural Networks (BNNs)

### Mathematical Explanation
Traditional Neural Networks learn a **single set of weights** (point estimate).  
Bayesian Neural Networks model the **weights as distributions** and compute the **posterior** using Bayes' Theorem.

#### Core Bayesian Formula for Neural Networks
$$
P(\theta | D) = \frac{P(D | \theta) \cdot P(\theta)}{P(D)}
$$

Where:
- $\theta$ = all weights and biases of the network
- $D$ = training dataset

#### Predictive Distribution
$$
P(y^* | x^*, D) = \int P(y^* | x^*, \theta) \, P(\theta | D) \, d\theta
$$

#### Practical Approximation: Monte Carlo Dropout

#### Python Code Example (Monte Carlo Dropout)

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class BayesianNN(nn.Module):
    def __init__(self, input_size=4, hidden_size=32, output_size=3, dropout_rate=0.2):
        super().__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.dropout = nn.Dropout(dropout_rate)
        self.fc2 = nn.Linear(hidden_size, output_size)
    
    def forward(self, x, apply_dropout=True):
        x = F.relu(self.fc1(x))
        if apply_dropout:
            x = self.dropout(x)
        x = self.fc2(x)
        return F.softmax(x, dim=1)
    
    def predict_with_uncertainty(self, x, n_samples=50):
        self.train()
        predictions = []
        with torch.no_grad():
            for _ in range(n_samples):
                pred = self.forward(x, apply_dropout=True)
                predictions.append(pred)
        predictions = torch.stack(predictions)
        mean_pred = predictions.mean(dim=0)
        uncertainty = predictions.std(dim=0)
        return mean_pred, uncertainty

Deployment Algorithm / Steps

Train & Optimize the Model
Train your model (e.g., BayesianNN with MC Dropout).
Convert to a portable format:Python# Example: TorchScript export
scripted_model = torch.jit.script(model)
scripted_model.save("model_scripted.pt")

Serialize the Model
Use ONNX for maximum cross-platform compatibility:Pythonimport torch.onnx
dummy_input = torch.randn(1, 4)
torch.onnx.export(model, dummy_input, "model.onnx", opset_version=11)

Containerize with Docker (Recommended for Cross-Platform)
Create a Dockerfile:dockerfileFROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
COPY model_scripted.pt app.py .
CMD ["python", "app.py"]

Build & Run ContainerBashdocker build -t ml-model-crossplatform .
docker run -p 8080:8080 ml-model-crossplatform
Inference Across Platforms
Use ONNX Runtime (runs on Windows, Linux, macOS, Android, iOS, WebAssembly):Pythonimport onnxruntime as ort
session = ort.InferenceSession("model.onnx")
input_name = session.get_inputs()[0].name
output = session.run(None, {input_name: dummy_input.numpy()})

Test & Monitor
Validate on target platforms.
Add uncertainty estimation for Bayesian models.
Monitor with tools like Prometheus + Grafana.
