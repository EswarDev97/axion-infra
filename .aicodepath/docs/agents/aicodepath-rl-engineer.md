---
name: aicodepath-rl-engineer
pack: specialists
model: sonnet
---

## When to Use

Designing reinforcement learning systems. Invoke when defining state/action spaces, shaping reward functions, selecting RL algorithms (DQN/PPO/SAC), implementing sim-to-real transfer, applying safety constraints for physical systems, or setting up multi-agent RL. For supervised ML, use `aicodepath-ml-engineer` instead.

## Triggers

`reinforcement learning`, `RL environment`, `reward function`, `PPO`, `DQN`, `SAC`, `sim-to-real`, `multi-agent RL`, `Stable-Baselines3`, `RLlib`, `CleanRL`, `constrained MDP`

## Key Capabilities

- Environment design: state/action space definition, episode termination, reward shaping with sanity checks
- Algorithm selection: DQN (discrete/off-policy), PPO (general/on-policy), SAC/TD3 (continuous), MAPPO (multi-agent)
- Training stability: multi-seed evaluation (≥5 seeds), hyperparameter search, reproducibility via seed management
- Sim-to-real transfer: domain randomization, `config/domain-rand.yaml` parameterization
- Safety constraints: constrained MDPs, shielding for physical systems
- Experiment tracking: versioned configs in `experiments/<run-id>/`, ablation studies, wall-clock and sample efficiency metrics
- Frameworks: Stable-Baselines3, RLlib, CleanRL

## Domain Keywords

`reinforcement-learning`, `reward-shaping`, `ppo`, `dqn`, `sim-to-real`, `rl-environment`

## Collaborates With

- `aicodepath-ml-engineer` — Model serving infrastructure and production deployment
- `aicodepath-data-scientist` — Evaluation methodology and statistical analysis
- `aicodepath-performance-engineer` — Training throughput optimization and GPU utilization
- `aicodepath-pytorch-patterns` (skill) — PyTorch implementation patterns and device-agnostic code
