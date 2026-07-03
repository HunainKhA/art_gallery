import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config

# Import separate route modules
from routers import artworks, artists, calculator, payments, customers, sales, frames, fittings, collection_types, mediums, crm_documents, invoices

app = FastAPI(
    title="Mainframe Art Gallery API",
    description="Decoupled/Headless API for SugarCRM Art Gallery Upgrade",
    version="1.0.0"
)

# Configure CORS (Cross-Origin Resource Sharing)
# Allows our React frontend to request data from the Python API
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the page-specific routers we created
app.include_router(artworks.router)
app.include_router(artists.router)
app.include_router(calculator.router)
app.include_router(payments.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(frames.router)
app.include_router(fittings.router)
app.include_router(collection_types.router)
app.include_router(mediums.router)
app.include_router(crm_documents.router)
app.include_router(invoices.router)

@app.get("/")
def home():
    """
    Test landing endpoint to confirm server health.
    """
    return {
        "status": "online",
        "message": "Welcome to the Mainframe Art Gallery API Server!",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    # Start the server locally
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
