.PHONY: help install install-board install-agent dev dev-board dev-agent build build-board build-agent build-contract ci ci-board ci-agent ci-contract test e2e lint format lighthouse security-scan clean

# --- Colors and Formatting ---
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

help: ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# --- Installation ---
install: install-board install-agent ## Install all dependencies

install-board:
	@echo "$(CYAN)Installing board dependencies...$(RESET)"
	@cd board && npm install

install-agent:
	@echo "$(CYAN)Installing agent dependencies...$(RESET)"
	@cd agent && npm install

# --- Development ---
dev: ## Run all development servers
	@echo "$(YELLOW)Run 'make dev-board' and 'make dev-agent' in separate terminals, or use concurrently.$(RESET)"

dev-board: ## Start board frontend dev server
	@echo "$(CYAN)Starting board dev server...$(RESET)"
	@cd board && npm run dev

dev-agent: ## Start agent backend dev server
	@echo "$(CYAN)Starting agent dev server...$(RESET)"
	@cd agent && npm start

# --- Build ---
build: build-board build-agent build-contract ## Build all components

build-board: ## Build board frontend
	@echo "$(CYAN)Building board...$(RESET)"
	@cd board && npm run build

build-agent: ## Build agent backend
	@echo "$(CYAN)Building agent...$(RESET)"
	@cd agent && npm run build

build-contract: ## Build contract
	@echo "$(CYAN)Building contract...$(RESET)"
	@cd contract && cargo build --release

# --- Continuous Integration & Testing ---
ci: ci-board ci-agent ci-contract ## Run all CI checks

ci-board: ## Run CI for board
	@echo "$(CYAN)Running board CI...$(RESET)"
	@cd board && npm run lint && npm run typecheck && npm run test:coverage

ci-agent: ## Run CI for agent
	@echo "$(CYAN)Running agent CI...$(RESET)"
	@cd agent && npm run build && npm run test

ci-contract: ## Run CI for contract
	@echo "$(CYAN)Running contract CI...$(RESET)"
	@cd contract && cargo check --release

test: test-board test-agent test-contract ## Run all tests

test-board: ## Run tests for board
	@echo "$(CYAN)Running board tests...$(RESET)"
	@cd board && npm run test

test-agent: ## Run tests for agent
	@echo "$(CYAN)Running agent tests...$(RESET)"
	@cd agent && npm run test

test-contract: ## Run tests for contract
	@echo "$(CYAN)Running contract tests...$(RESET)"
	@cd contract && cargo test

e2e: ## Run Playwright E2E tests
	@echo "$(CYAN)Running E2E tests...$(RESET)"
	@cd board && npx playwright test

# --- Quality & Security ---
lint: ## Run linters for board and contract
	@cd board && npm run lint
	@cd contract && cargo clippy

format: ## Format Rust code
	@cd contract && cargo fmt

lighthouse: ## Run Lighthouse CI
	@echo "$(CYAN)Running Lighthouse CI audit...$(RESET)"
	@cd board && npx lhci autorun

security-scan: ## Run security audits
	@echo "$(CYAN)Running Security Scan...$(RESET)"
	@cd board && npm audit --audit-level=high || true
	@cd agent && npm audit --audit-level=high || true
	@cd board && npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary || true

# --- Clean ---
clean: ## Clean all build artifacts and node_modules
	@echo "$(CYAN)Cleaning board...$(RESET)"
	@rm -rf board/node_modules board/.next board/out
	@echo "$(CYAN)Cleaning agent...$(RESET)"
	@rm -rf agent/node_modules agent/dist
	@echo "$(CYAN)Cleaning contract...$(RESET)"
	@cd contract && cargo clean
	@echo "$(GREEN)Clean complete.$(RESET)"
