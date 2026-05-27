"""Example usage of Flowchart and Sequence Diagram generators."""
import logging
from pathlib import Path
from flowchart import FlowchartGenerator
from sequence_diagram import SequenceDiagramGenerator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_example_service_file() -> str:
    """Create an example Python service file for testing."""
    example_code = '''
"""Example tenant service with API endpoint."""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel


class TenantCreateRequest(BaseModel):
    """Request model for creating a tenant."""
    name: str
    email: str
    plan: str


class TenantResponse(BaseModel):
    """Response model for tenant."""
    id: int
    name: str
    email: str
    plan: str
    status: str


router = APIRouter()


class TenantRepository:
    """Repository for tenant data access."""

    def save(self, tenant_data: dict) -> dict:
        """Save tenant to database."""
        # Simulate database insert
        tenant_id = self._execute_query("INSERT INTO tenants VALUES (...)")
        return {"id": tenant_id, **tenant_data}

    def _execute_query(self, sql: str) -> int:
        """Execute SQL query."""
        # Simulate database execution
        return 12345

    def find_by_email(self, email: str) -> Optional[dict]:
        """Find tenant by email."""
        result = self._execute_query(f"SELECT * FROM tenants WHERE email='{email}'")
        return result


class TenantService:
    """Service layer for tenant business logic."""

    def __init__(self):
        self.repository = TenantRepository()

    async def create_tenant(self, data: dict) -> dict:
        """Create a new tenant with validation."""
        # Validate email uniqueness
        existing = self.repository.find_by_email(data['email'])
        if existing:
            raise ValueError("Email already exists")

        # Process tenant creation
        tenant = self._prepare_tenant_data(data)

        # Save to database
        saved_tenant = self.repository.save(tenant)

        # Send welcome email (external service)
        await self._send_welcome_email(saved_tenant['email'])

        return saved_tenant

    def _prepare_tenant_data(self, data: dict) -> dict:
        """Prepare tenant data for storage."""
        return {
            **data,
            'status': 'active'
        }

    async def _send_welcome_email(self, email: str):
        """Send welcome email via external service."""
        # Simulate HTTP call to email service
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post("https://email-service.com/send", json={"to": email})


@router.post("/api/v1/tenants", status_code=status.HTTP_201_CREATED)
async def create_tenant_endpoint(request: TenantCreateRequest) -> TenantResponse:
    """API endpoint to create a new tenant."""
    service = TenantService()

    try:
        # Call service layer
        tenant = await service.create_tenant(request.dict())

        # Return response
        return TenantResponse(**tenant)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


def process_order(order_data: dict) -> dict:
    """
    Process an order with multiple decision points.

    This function demonstrates various control flow patterns:
    - Conditional branches (if/elif/else)
    - Loops (for, while)
    - Exception handling (try/except/finally)
    - Early returns
    """
    # Validate order
    if not order_data:
        return {"error": "Order data is required"}

    if not order_data.get('items'):
        return {"error": "Order must contain items"}

    # Calculate total
    total = 0
    for item in order_data['items']:
        if item.get('quantity', 0) <= 0:
            continue
        total += item['price'] * item['quantity']

    # Apply discount if applicable
    if total > 100:
        discount = total * 0.1
        total -= discount

    # Process payment based on method
    payment_method = order_data.get('payment_method', 'card')

    try:
        if payment_method == 'card':
            result = process_card_payment(total)
        elif payment_method == 'cash':
            result = process_cash_payment(total)
        else:
            return {"error": "Invalid payment method"}

        if result['success']:
            # Send confirmation
            send_order_confirmation(order_data['customer_email'])
            return {
                "success": True,
                "order_id": result['transaction_id'],
                "total": total
            }
        else:
            return {"error": "Payment failed"}

    except Exception as e:
        # Log error
        log_payment_error(str(e))
        return {"error": "Payment processing error"}
    finally:
        # Cleanup
        cleanup_session()

    # This should never be reached
    return {"error": "Unexpected state"}


def process_card_payment(amount: float) -> dict:
    """Process card payment."""
    return {"success": True, "transaction_id": "TXN123"}


def process_cash_payment(amount: float) -> dict:
    """Process cash payment."""
    return {"success": True, "transaction_id": "CASH123"}


def send_order_confirmation(email: str):
    """Send order confirmation email."""
    pass


def log_payment_error(error: str):
    """Log payment error."""
    pass


def cleanup_session():
    """Cleanup payment session."""
    pass
'''

    # Write to temporary file
    temp_file = Path("/tmp/example_tenant_service.py")
    temp_file.write_text(example_code)
    return str(temp_file)


def example_flowchart_generation():
    """Demonstrate flowchart generation."""
    logger.info("=" * 60)
    logger.info("FLOWCHART GENERATOR EXAMPLE")
    logger.info("=" * 60)

    # Create example file
    example_file = create_example_service_file()
    logger.info(f"Created example file: {example_file}")

    # Initialize generator
    generator = FlowchartGenerator()

    # Example 1: Generate flowchart for specific function
    logger.info("\n--- Example 1: Flowchart for 'process_order' function ---")
    result = generator.generate(
        source_files=[example_file],
        options={
            'function_name': 'process_order',
            'direction': 'TD',  # Top-down
            'include_async': True
        }
    )

    logger.info(f"Confidence Score: {result.confidence_score:.2%}")
    logger.info(f"Metadata: {result.metadata}")
    logger.info(f"Warnings: {result.warnings}")
    logger.info("\nGenerated Mermaid Code:")
    print(result.mermaid_code)

    # Example 2: Generate flowchart for async function
    logger.info("\n--- Example 2: Flowchart for 'create_tenant' function ---")
    result2 = generator.generate(
        source_files=[example_file],
        options={
            'function_name': 'create_tenant',
            'direction': 'LR',  # Left-right
            'include_async': True
        }
    )

    logger.info(f"Confidence Score: {result2.confidence_score:.2%}")
    logger.info("\nGenerated Mermaid Code:")
    print(result2.mermaid_code)


def example_sequence_diagram_generation():
    """Demonstrate sequence diagram generation."""
    logger.info("\n" + "=" * 60)
    logger.info("SEQUENCE DIAGRAM GENERATOR EXAMPLE")
    logger.info("=" * 60)

    # Create example file
    example_file = create_example_service_file()
    logger.info(f"Using example file: {example_file}")

    # Initialize generator
    generator = SequenceDiagramGenerator()

    # Example 1: Generate sequence diagram for API endpoint
    logger.info("\n--- Example 1: Trace 'POST /api/v1/tenants' endpoint ---")
    result = generator.generate(
        source_files=[example_file],
        options={
            'endpoint': 'POST /api/v1/tenants',
            'include_activations': True,
            'include_returns': True,
            'max_depth': 10
        }
    )

    logger.info(f"Confidence Score: {result.confidence_score:.2%}")
    logger.info(f"Metadata: {result.metadata}")
    logger.info(f"Warnings: {result.warnings}")
    logger.info("\nGenerated Mermaid Code:")
    print(result.mermaid_code)

    # Example 2: Generate without activation boxes
    logger.info("\n--- Example 2: Simplified diagram (no activations) ---")
    result2 = generator.generate(
        source_files=[example_file],
        options={
            'include_activations': False,
            'include_returns': True
        }
    )

    logger.info(f"Confidence Score: {result2.confidence_score:.2%}")
    logger.info("\nGenerated Mermaid Code:")
    print(result2.mermaid_code)


def example_combined_analysis():
    """Demonstrate using both generators together."""
    logger.info("\n" + "=" * 60)
    logger.info("COMBINED ANALYSIS EXAMPLE")
    logger.info("=" * 60)

    example_file = create_example_service_file()

    # Generate both diagrams
    flowchart_gen = FlowchartGenerator()
    sequence_gen = SequenceDiagramGenerator()

    logger.info("\nGenerating comprehensive documentation...")

    # Flowchart for business logic
    flowchart = flowchart_gen.generate(
        [example_file],
        {'function_name': 'process_order', 'direction': 'TD'}
    )

    # Sequence diagram for API flow
    sequence = sequence_gen.generate(
        [example_file],
        {'endpoint': 'POST /api/v1/tenants'}
    )

    logger.info("\n" + "=" * 60)
    logger.info("DOCUMENTATION PACKAGE GENERATED")
    logger.info("=" * 60)
    logger.info(f"\n1. Flowchart (Confidence: {flowchart.confidence_score:.2%})")
    logger.info(f"   - Shows control flow for 'process_order' function")
    logger.info(f"   - Includes decision branches, loops, and error handling")

    logger.info(f"\n2. Sequence Diagram (Confidence: {sequence.confidence_score:.2%})")
    logger.info(f"   - Traces API call through all layers")
    logger.info(f"   - Shows: Client -> API -> Service -> Repository -> Database")

    logger.info("\n--- FLOWCHART MERMAID CODE ---")
    print(flowchart.mermaid_code)

    logger.info("\n--- SEQUENCE DIAGRAM MERMAID CODE ---")
    print(sequence.mermaid_code)


if __name__ == '__main__':
    # Run examples
    example_flowchart_generation()
    example_sequence_diagram_generation()
    example_combined_analysis()

    logger.info("\n" + "=" * 60)
    logger.info("EXAMPLES COMPLETED")
    logger.info("=" * 60)
    logger.info("\nYou can copy the generated Mermaid code and paste it into:")
    logger.info("  - GitHub/GitLab markdown files")
    logger.info("  - Mermaid Live Editor (https://mermaid.live)")
    logger.info("  - Confluence, Notion, or other documentation tools")
