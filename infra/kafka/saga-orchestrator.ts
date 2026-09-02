/**
 * Digital Lending OS Saga Orchestrator — Payment Workflow
 *
 * Implements the Saga pattern for distributed transactions using a state machine approach.
 *
 * PaymentSaga orchestrates the flow:
 *   payment.initiated → wallet.debit → escrow.create → notification.send
 *
 * On failure at any step, compensating (undo) transactions are triggered:
 *   - If escrow.create fails → wallet.credit (refund)
 *   - If wallet.debit fails → payment.cancel
 *   - If notification.send fails → non-critical, logged but saga continues
 *
 * State Machine:
 *
 *   IDLE ──▶ INITIATED ──▶ DEBITING_WALLET ──▶ CREATING_ESCROW ──▶ SENDING_NOTIFICATION ──▶ COMPLETED
 *              │                │                       │                      │
 *              ▼                ▼                       ▼                      ▼
 *           FAILED         COMPENSATING_WALLET    COMPENSATING_ESCROW       FAILED (non-critical)
 *                              │                       │
 *                              ▼                       ▼
 *                           FAILED                  COMPENSATING_WALLET
 *                                                      │
 *                                                      ▼
 *                                                   FAILED
 */

import { v4 as uuidv4 } from "uuid";
import type { Digital Lending OSProducer } from "./producer";
import { buildEvent, type BaseEvent } from "./producer";
import type { Digital Lending OSConsumer } from "./consumer";
import type { MessageMetadata } from "./consumer";
import {
  PaymentInitiatedEventSchema,
  PaymentCompletedEventSchema,
  PaymentFailedEventSchema,
  EscrowCreatedEventSchema,
  EscrowCancelledEventSchema,
  WalletDepositedEventSchema,
  WalletWithdrawnEventSchema,
} from "./event-schemas";
import type {
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
  EscrowCreatedPayload,
  EscrowCancelledPayload,
} from "./event-schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SagaState =
  | "IDLE"
  | "INITIATED"
  | "DEBITING_WALLET"
  | "WALLET_DEBITED"
  | "CREATING_ESCROW"
  | "ESCROW_CREATED"
  | "SENDING_NOTIFICATION"
  | "COMPLETED"
  | "COMPENSATING_WALLET"
  | "COMPENSATING_ESCROW"
  | "COMPENSATING_PAYMENT"
  | "FAILED";

export type SagaStep =
  | "PAYMENT_INITIATE"
  | "WALLET_DEBIT"
  | "ESCROW_CREATE"
  | "NOTIFICATION_SEND"
  | "COMPENSATE_WALLET_CREDIT"
  | "COMPENSATE_ESCROW_CANCEL"
  | "COMPENSATE_PAYMENT_CANCEL";

export interface SagaStepResult {
  step: SagaStep;
  status: "success" | "failed";
  error?: string;
  durationMs: number;
  timestamp: string;
}

export interface PaymentSagaData {
  /** Unique saga instance ID */
  sagaId: string;
  /** Correlation ID linking all events in this saga */
  correlationId: string;
  /** Current state in the state machine */
  state: SagaState;
  /** Current step being executed */
  currentStep: SagaStep | null;
  /** Payment data from the initiated event */
  payment: {
    paymentId: string;
    userId: string;
    payeeId?: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    provider: string;
    reference: string;
  } | null;
  /** Wallet operation data */
  wallet: {
    walletId: string;
    debitId?: string;
    creditId?: string;
    amount: number;
    currency: string;
  } | null;
  /** Escrow data */
  escrow: {
    escrowId: string;
    transactionId: string;
    amount: number;
    currency: string;
  } | null;
  /** Notification data */
  notification: {
    notificationId?: string;
    channels: string[];
  } | null;
  /** History of all steps executed in this saga */
  stepHistory: SagaStepResult[];
  /** Error that caused the saga to fail */
  failureReason: string | null;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ─── State Machine Transitions ────────────────────────────────────────────────

/**
 * Valid state transitions for the PaymentSaga.
 * Key = current state, Value = array of allowed next states.
 */
const STATE_TRANSITIONS: Record<SagaState, SagaState[]> = {
  IDLE: ["INITIATED"],
  INITIATED: ["DEBITING_WALLET", "COMPENSATING_PAYMENT", "FAILED"],
  DEBITING_WALLET: ["WALLET_DEBITED", "COMPENSATING_PAYMENT", "FAILED"],
  WALLET_DEBITED: ["CREATING_ESCROW", "COMPENSATING_WALLET", "FAILED"],
  CREATING_ESCROW: ["ESCROW_CREATED", "COMPENSATING_WALLET", "FAILED"],
  ESCROW_CREATED: ["SENDING_NOTIFICATION", "COMPENSATING_ESCROW", "FAILED"],
  SENDING_NOTIFICATION: ["COMPLETED", "FAILED"], // Notification failure is non-critical
  COMPLETED: [], // Terminal state
  COMPENSATING_WALLET: ["FAILED", "COMPENSATING_PAYMENT"],
  COMPENSATING_ESCROW: ["COMPENSATING_WALLET", "FAILED"],
  COMPENSATING_PAYMENT: ["FAILED"], // Terminal state
  FAILED: [], // Terminal state
};

// ─── Saga Orchestrator Class ──────────────────────────────────────────────────

export class PaymentSaga {
  private producer: Digital Lending OSProducer;
  private consumer: Digital Lending OSConsumer;
  private sagaInstances: Map<string, PaymentSagaData>;
  private serviceName: string;
  private correlationToSaga: Map<string, string>; // correlationId → sagaId

  constructor(options: {
    producer: Digital Lending OSProducer;
    consumer: Digital Lending OSConsumer;
    serviceName?: string;
  }) {
    this.producer = options.producer;
    this.consumer = options.consumer;
    this.serviceName = options.serviceName ?? "saga-orchestrator";
    this.sagaInstances = new Map();
    this.correlationToSaga = new Map();
  }

  // ── Start Listening ────────────────────────────────────────────────────────

  /**
   * Start the saga orchestrator. Registers handlers on the consumer
   * for all relevant payment, wallet, escrow, and notification events.
   */
  async start(): Promise<void> {
    console.info("[PaymentSaga] Starting saga orchestrator...");

    this.consumer.onMessage(async (event: BaseEvent, metadata: MessageMetadata) => {
      await this.routeEvent(event, metadata);
    });

    await this.consumer.start();
    console.info("[PaymentSaga] Saga orchestrator started. Listening for events.");
  }

  /**
   * Stop the saga orchestrator gracefully.
   */
  async stop(): Promise<void> {
    console.info("[PaymentSaga] Stopping saga orchestrator...");
    await this.consumer.stop();
    console.info("[PaymentSaga] Saga orchestrator stopped.");
  }

  // ── Event Routing ─────────────────────────────────────────────────────────

  private async routeEvent(event: BaseEvent, metadata: MessageMetadata): Promise<void> {
    const { eventType, correlationId } = event;

    // Find the saga instance by correlation ID
    const sagaId = this.correlationToSaga.get(correlationId);

    switch (eventType) {
      // ── Saga-triggering events ──
      case "payment_initiated":
        await this.onPaymentInitiated(event, metadata);
        break;

      // ── Saga-continuation events ──
      case "payment_completed":
      case "wallet_withdrawn":
      case "escrow_created":
      case "escrow_funded":
      case "escrow_released":
        if (sagaId) {
          await this.onStepSuccess(event, metadata, sagaId);
        }
        break;

      // ── Saga-failure events ──
      case "payment_failed":
        if (sagaId) {
          await this.onStepFailed(event, metadata, sagaId);
        }
        break;

      // ── Escrow dispute/cancel events ──
      case "escrow_disputed":
      case "escrow_cancelled":
        if (sagaId) {
          await this.onEscrowDispute(event, metadata, sagaId);
        }
        break;

      default:
        // Not a saga-relevant event; skip
        break;
    }
  }

  // ── Saga Lifecycle Handlers ─────────────────────────────────────────────────

  /**
   * Handle payment.initiated — start a new saga instance.
   */
  private async onPaymentInitiated(event: BaseEvent, metadata: MessageMetadata): Promise<void> {
    // Validate the event payload
    const parsed = PaymentInitiatedEventSchema.safeParse(event);
    if (!parsed.success) {
      console.error("[PaymentSaga] Invalid payment_initiated event:", parsed.error);
      return;
    }

    const payload = parsed.data.payload;

    // Check if saga already exists for this payment (idempotency)
    const existingSaga = this.findSagaByPaymentId(payload.paymentId);
    if (existingSaga && existingSaga.state !== "FAILED") {
      console.info(
        `[PaymentSaga] Saga already exists for paymentId=${payload.paymentId} in state=${existingSaga.state}`,
      );
      return;
    }

    // Create new saga instance
    const correlationId = event.correlationId;
    const sagaId = uuidv4();
    const saga = this.createSagaInstance(sagaId, correlationId, payload);

    this.sagaInstances.set(sagaId, saga);
    this.correlationToSaga.set(correlationId, sagaId);

    console.info(
      `[PaymentSaga] New saga created: sagaId=${sagaId} paymentId=${payload.paymentId} correlationId=${correlationId}`,
    );

    // Transition: IDLE → INITIATED → DEBITING_WALLET
    this.transition(sagaId, "INITIATED");
    await this.executeWalletDebit(saga);
  }

  /**
   * Handle successful completion of a saga step.
   */
  private async onStepSuccess(event: BaseEvent, metadata: MessageMetadata, sagaId: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || saga.state === "COMPLETED" || saga.state === "FAILED") return;

    switch (event.eventType) {
      case "payment_completed":
        // Payment is confirmed; move to escrow creation
        await this.executeEscrowCreation(sagaId);
        break;

      case "wallet_withdrawn":
        // Wallet debit succeeded; move to escrow creation
        this.transition(sagaId, "WALLET_DEBITED");
        await this.executeEscrowCreation(sagaId);
        break;

      case "escrow_created":
        // Escrow created; move to notification
        this.transition(sagaId, "ESCROW_CREATED");
        await this.executeNotificationSend(sagaId);
        break;

      case "escrow_funded":
        // Escrow funded — proceed to notification if not already done
        if (saga.state === "ESCROW_CREATED" || saga.state === "CREATING_ESCROW") {
          this.transition(sagaId, "ESCROW_CREATED");
          await this.executeNotificationSend(sagaId);
        }
        break;

      default:
        break;
    }
  }

  /**
   * Handle failure of a saga step.
   */
  private async onStepFailed(event: BaseEvent, metadata: MessageMetadata, sagaId: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || saga.state === "COMPLETED" || saga.state === "FAILED") return;

    let parsed;
    if (event.eventType === "payment_failed") {
      parsed = PaymentFailedEventSchema.safeParse(event);
    }

    const errorMessage = parsed?.success
      ? parsed.data.payload.errorMessage
      : "Unknown error";

    await this.compensate(sagaId, errorMessage);
  }

  /**
   * Handle escrow dispute or cancellation — triggers compensation.
   */
  private async onEscrowDispute(event: BaseEvent, metadata: MessageMetadata, sagaId: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || saga.state === "COMPLETED" || saga.state === "FAILED") return;

    const reason = event.eventType === "escrow_disputed"
      ? "Escrow disputed"
      : "Escrow cancelled";

    await this.compensate(sagaId, reason);
  }

  // ── Saga Step Execution ────────────────────────────────────────────────────

  /**
   * Step 1: Debit the buyer's wallet for the payment amount.
   * Emits wallet.events.wallet_withdrawn (via wallet service consuming payment events).
   */
  private async executeWalletDebit(saga: PaymentSagaData): Promise<void> {
    if (saga.state !== "INITIATED") return;

    this.transition(this.getSagaId(saga), "DEBITING_WALLET");
    const start = Date.now();

    try {
      // Build the wallet debit event
      const walletDebitEvent = buildEvent(this.serviceName, {
        eventType: "wallet_withdrawn",
        topic: "wallet.events.wallet_withdrawn",
        key: saga.wallet!.walletId,
        payload: {
          walletId: saga.wallet!.walletId,
          userId: saga.payment!.userId,
          amount: saga.payment!.amount,
          currency: saga.payment!.currency,
          balanceBefore: 0, // Wallet service will compute
          balanceAfter: 0, // Wallet service will compute
          destination: "escrow_hold",
          withdrawalId: uuidv4(),
        },
        correlationId: saga.correlationId,
        causationId: saga.sagaId,
      });

      // Note: In a real implementation, this would call the wallet service directly
      // or use a command topic. For event-driven, we emit a command event.
      // The wallet service consumes this and publishes wallet.events.wallet_withdrawn.
      const result = await this.producer.produce(
        "wallet.commands.wallet_withdraw",
        saga.wallet!.walletId,
        walletDebitEvent,
      );

      if (result.success) {
        this.recordStep(this.getSagaId(saga), {
          step: "WALLET_DEBIT",
          status: "success",
          durationMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
        // The saga waits for wallet.events.wallet_withdrawn to continue
      } else {
        throw new Error(`Wallet debit command failed: ${result.error?.message}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordStep(this.getSagaId(saga), {
        step: "WALLET_DEBIT",
        status: "failed",
        error: err.message,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
      await this.compensate(this.getSagaId(saga), `Wallet debit failed: ${err.message}`);
    }
  }

  /**
   * Step 2: Create the escrow transaction.
   */
  private async executeEscrowCreation(sagaId: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || (saga.state !== "WALLET_DEBITED" && saga.state !== "DEBITING_WALLET")) return;

    this.transition(sagaId, "CREATING_ESCROW");
    const start = Date.now();

    try {
      const escrowCreateEvent = buildEvent(this.serviceName, {
        eventType: "escrow_created",
        topic: "escrow.events.escrow_created",
        key: saga.escrow!.escrowId,
        payload: {
          escrowId: saga.escrow!.escrowId,
          transactionId: saga.escrow!.transactionId,
          sellerId: saga.payment!.payeeId ?? "",
          buyerId: saga.payment!.userId,
          amount: saga.payment!.amount,
          currency: saga.payment!.currency,
          description: `Payment ${saga.payment!.reference} - Escrow hold`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day expiry
        },
        correlationId: saga.correlationId,
        causationId: saga.sagaId,
      });

      const result = await this.producer.produce(
        "escrow.commands.escrow_create",
        saga.escrow!.escrowId,
        escrowCreateEvent,
      );

      if (result.success) {
        this.recordStep(sagaId, {
          step: "ESCROW_CREATE",
          status: "success",
          durationMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        });
        // Wait for escrow.events.escrow_created
      } else {
        throw new Error(`Escrow creation command failed: ${result.error?.message}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordStep(sagaId, {
        step: "ESCROW_CREATE",
        status: "failed",
        error: err.message,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
      await this.compensate(sagaId, `Escrow creation failed: ${err.message}`);
    }
  }

  /**
   * Step 3: Send notification to buyer and seller.
   * This is non-critical — failure does not trigger compensation.
   */
  private async executeNotificationSend(sagaId: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || saga.state !== "ESCROW_CREATED") return;

    this.transition(sagaId, "SENDING_NOTIFICATION");
    const start = Date.now();

    try {
      // Send notification to buyer
      const buyerNotification = buildEvent(this.serviceName, {
        eventType: "notification_in_app",
        topic: "notification.events.notification_in_app",
        key: saga.payment!.userId,
        payload: {
          userId: saga.payment!.userId,
          notificationId: uuidv4(),
          title: "Payment Confirmed",
          body: `Your payment of ${saga.payment!.currency} ${saga.payment!.amount} has been confirmed and is held in escrow.`,
          category: "payment",
          actionUrl: `/payments/${saga.payment!.paymentId}`,
          read: false,
        },
        correlationId: saga.correlationId,
        causationId: saga.sagaId,
      });

      // Send notification to seller/payee if present
      const sellerNotification = saga.payment!.payeeId
        ? buildEvent(this.serviceName, {
            eventType: "notification_in_app",
            topic: "notification.events.notification_in_app",
            key: saga.payment!.payeeId!,
            payload: {
              userId: saga.payment!.payeeId!,
              notificationId: uuidv4(),
              title: "Payment Received",
              body: `You have received a payment of ${saga.payment!.currency} ${saga.payment!.amount} held in escrow.`,
              category: "payment",
              actionUrl: `/escrow/${saga.escrow!.escrowId}`,
              read: false,
            },
            correlationId: saga.correlationId,
            causationId: saga.sagaId,
          })
        : null;

      await this.producer.produce(
        "notification.commands.notification_send",
        saga.payment!.userId,
        buyerNotification,
      );

      if (sellerNotification) {
        await this.producer.produce(
          "notification.commands.notification_send",
          saga.payment!.payeeId!,
          sellerNotification,
        );
      }

      this.recordStep(sagaId, {
        step: "NOTIFICATION_SEND",
        status: "success",
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });

      // Complete the saga
      this.transition(sagaId, "COMPLETED");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // Notification failure is non-critical — mark saga as completed anyway
      console.warn(
        `[PaymentSaga] Notification send failed (non-critical) for sagaId=${sagaId}: ${err.message}`,
      );
      this.recordStep(sagaId, {
        step: "NOTIFICATION_SEND",
        status: "failed",
        error: err.message,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
      this.transition(sagaId, "COMPLETED");
    }
  }

  // ── Compensating Transactions ──────────────────────────────────────────────

  /**
   * Execute compensating (undo) transactions based on how far the saga progressed.
   */
  private async compensate(sagaId: string, reason: string): Promise<void> {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga || saga.state === "COMPLETED" || saga.state === "FAILED") return;

    saga.failureReason = reason;
    saga.updatedAt = new Date().toISOString();

    console.warn(
      `[PaymentSaga] Initiating compensation for sagaId=${sagaId} currentState=${saga.state} reason=${reason}`,
    );

    // Determine which compensations are needed based on current state
    const needsEscrowCancel =
      saga.state === "CREATING_ESCROW" ||
      saga.state === "ESCROW_CREATED" ||
      saga.state === "SENDING_NOTIFICATION";

    const needsWalletCredit =
      needsEscrowCancel ||
      saga.state === "WALLET_DEBITED" ||
      saga.state === "DEBITING_WALLET";

    // Execute compensations in reverse order of original steps
    if (needsEscrowCancel && saga.escrow) {
      this.transition(sagaId, "COMPENSATING_ESCROW");
      await this.compensateEscrowCancel(saga);
    }

    if (needsWalletCredit && saga.wallet) {
      this.transition(sagaId, "COMPENSATING_WALLET");
      await this.compensateWalletCredit(saga);
    }

    // Mark saga as failed
    this.transition(sagaId, "FAILED");
    console.error(
      `[PaymentSaga] Saga FAILED: sagaId=${sagaId} paymentId=${saga.payment?.paymentId} reason=${reason}`,
    );

    // Emit saga completion event for observability
    await this.emitSagaCompletedEvent(saga, false);
  }

  /**
   * Compensate: Cancel the escrow transaction.
   */
  private async compensateEscrowCancel(saga: PaymentSagaData): Promise<void> {
    const start = Date.now();

    try {
      const cancelEvent = buildEvent(this.serviceName, {
        eventType: "escrow_cancelled",
        topic: "escrow.events.escrow_cancelled",
        key: saga.escrow!.escrowId,
        payload: {
          escrowId: saga.escrow!.escrowId,
          transactionId: saga.escrow!.transactionId,
          cancelledBy: this.serviceName,
          reason: saga.failureReason ?? "Saga compensation",
          refundAmount: saga.escrow!.amount,
          currency: saga.escrow!.currency,
          refundedTo: saga.payment!.userId,
        },
        correlationId: saga.correlationId,
        causationId: saga.sagaId,
      });

      await this.producer.produce(
        "escrow.commands.escrow_cancel",
        saga.escrow!.escrowId,
        cancelEvent,
      );

      this.recordStep(this.getSagaId(saga), {
        step: "COMPENSATE_ESCROW_CANCEL",
        status: "success",
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[PaymentSaga] Compensation failed (escrow cancel) for sagaId=${saga.sagaId}: ${err.message}`,
      );
      this.recordStep(this.getSagaId(saga), {
        step: "COMPENSATE_ESCROW_CANCEL",
        status: "failed",
        error: err.message,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Compensate: Credit the buyer's wallet (refund the debit).
   */
  private async compensateWalletCredit(saga: PaymentSagaData): Promise<void> {
    const start = Date.now();

    try {
      const creditEvent = buildEvent(this.serviceName, {
        eventType: "wallet_deposited",
        topic: "wallet.events.wallet_deposited",
        key: saga.wallet!.walletId,
        payload: {
          walletId: saga.wallet!.walletId,
          userId: saga.payment!.userId,
          amount: saga.wallet!.amount,
          currency: saga.wallet!.currency,
          balanceBefore: 0, // Wallet service computes
          balanceAfter: 0,
          source: "refund",
          referenceId: saga.payment!.paymentId,
        },
        correlationId: saga.correlationId,
        causationId: saga.sagaId,
        metadata: {
          reason: "Saga compensation",
          sagaId: saga.sagaId,
        },
      });

      await this.producer.produce(
        "wallet.commands.wallet_deposit",
        saga.wallet!.walletId,
        creditEvent,
      );

      this.recordStep(this.getSagaId(saga), {
        step: "COMPENSATE_WALLET_CREDIT",
        status: "success",
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[PaymentSaga] Compensation failed (wallet credit) for sagaId=${saga.sagaId}: ${err.message}`,
      );
      this.recordStep(this.getSagaId(saga), {
        step: "COMPENSATE_WALLET_CREDIT",
        status: "failed",
        error: err.message,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── State Machine ─────────────────────────────────────────────────────────

  /**
   * Transition the saga to a new state. Validates the transition is legal.
   */
  private transition(sagaId: string, newState: SagaState): void {
    const saga = this.sagaInstances.get(sagaId);
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }

    const allowedTransitions = STATE_TRANSITIONS[saga.state];
    if (!allowedTransitions.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${saga.state} → ${newState}. ` +
        `Allowed: [${allowedTransitions.join(", ")}]`,
      );
    }

    const oldState = saga.state;
    saga.state = newState;
    saga.updatedAt = new Date().toISOString();

    if (newState === "COMPLETED" || newState === "FAILED") {
      saga.completedAt = new Date().toISOString();
    }

    console.info(
      `[PaymentSaga] State transition: sagaId=${sagaId} ${oldState} → ${newState}`,
    );
  }

  // ── Saga Instance Management ──────────────────────────────────────────────

  private createSagaInstance(
    sagaId: string,
    correlationId: string,
    payment: PaymentInitiatedPayload,
  ): PaymentSagaData {
    const now = new Date().toISOString();
    return {
      sagaId,
      correlationId,
      state: "IDLE",
      currentStep: null,
      payment: {
        paymentId: payment.paymentId,
        userId: payment.userId,
        payeeId: payment.payeeId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        provider: payment.provider,
        reference: payment.reference,
      },
      wallet: {
        walletId: `wallet:${payment.userId}`,
        amount: payment.amount,
        currency: payment.currency,
      },
      escrow: {
        escrowId: uuidv4(),
        transactionId: uuidv4(),
        amount: payment.amount,
        currency: payment.currency,
      },
      notification: {
        channels: ["in_app", "email"],
      },
      stepHistory: [],
      failureReason: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  }

  private getSagaId(saga: PaymentSagaData): string {
    return saga.sagaId;
  }

  private findSagaByPaymentId(paymentId: string): PaymentSagaData | undefined {
    for (const saga of this.sagaInstances.values()) {
      if (saga.payment?.paymentId === paymentId) {
        return saga;
      }
    }
    return undefined;
  }

  private recordStep(sagaId: string, result: SagaStepResult): void {
    const saga = this.sagaInstances.get(sagaId);
    if (saga) {
      saga.currentStep = result.step;
      saga.stepHistory.push(result);
      saga.updatedAt = new Date().toISOString();
    }
  }

  // ── Observability Events ────────────────────────────────────────────────────

  private async emitSagaCompletedEvent(saga: PaymentSagaData, success: boolean): Promise<void> {
    const event = buildEvent(this.serviceName, {
      eventType: "saga_completed",
      topic: "audit.events.audit_action_logged",
      key: saga.payment!.userId,
      payload: {
        userId: saga.payment!.userId,
        action: success ? "payment_saga_completed" : "payment_saga_failed",
        resource: "payment_saga",
        resourceId: saga.sagaId,
        newState: {
          sagaId: saga.sagaId,
          correlationId: saga.correlationId,
          paymentId: saga.payment!.paymentId,
          state: saga.state,
          steps: saga.stepHistory,
          durationMs: saga.completedAt
            ? new Date(saga.completedAt).getTime() - new Date(saga.createdAt).getTime()
            : 0,
        },
        changes: {
          success,
          failureReason: saga.failureReason,
        },
      },
      correlationId: saga.correlationId,
      causationId: saga.sagaId,
    });

    await this.producer.produce(
      "audit.events.audit_action_logged",
      saga.payment!.userId,
      event,
    );
  }

  // ── Public Query Methods ──────────────────────────────────────────────────

  /**
   * Get a saga instance by saga ID.
   */
  getSaga(sagaId: string): PaymentSagaData | undefined {
    return this.sagaInstances.get(sagaId);
  }

  /**
   * Get a saga instance by correlation ID.
   */
  getSagaByCorrelationId(correlationId: string): PaymentSagaData | undefined {
    const sagaId = this.correlationToSaga.get(correlationId);
    return sagaId ? this.sagaInstances.get(sagaId) : undefined;
  }

  /**
   * Get all active (non-terminal) saga instances.
   */
  getActiveSagas(): PaymentSagaData[] {
    const terminalStates: SagaState[] = ["COMPLETED", "FAILED"];
    return Array.from(this.sagaInstances.values()).filter(
      (saga) => !terminalStates.includes(saga.state),
    );
  }

  /**
   * Get all saga instances for a given state.
   */
  getSagasByState(state: SagaState): PaymentSagaData[] {
    return Array.from(this.sagaInstances.values()).filter(
      (saga) => saga.state === state,
    );
  }

  /**
   * Get total count of saga instances (including terminal).
   */
  getSagaCount(): number {
    return this.sagaInstances.size;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Purge completed/failed saga instances older than the given age.
   * Useful for memory management in long-running processes.
   */
  purgeCompletedSagas(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let purged = 0;

    for (const [sagaId, saga] of this.sagaInstances) {
      if (
        (saga.state === "COMPLETED" || saga.state === "FAILED") &&
        saga.completedAt &&
        now - new Date(saga.completedAt).getTime() > maxAgeMs
      ) {
        this.sagaInstances.delete(sagaId);
        this.correlationToSaga.delete(saga.correlationId);
        purged++;
      }
    }

    if (purged > 0) {
      console.info(`[PaymentSaga] Purged ${purged} completed saga instances.`);
    }

    return purged;
  }
}

// ─── Export State Machine for Testing/Visualization ───────────────────────────

export { STATE_TRANSITIONS };
export type { PaymentSagaData, SagaStepResult, SagaState, SagaStep };
