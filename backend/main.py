import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config

# Touch to reload server after clean routers update
# Import separate route modules
from routers import artworks, artists, calculator, payments, customers, sales, frames, fittings, collection_types, mediums, crm_documents, invoices, settings, guest_auth, subscribers

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

from fastapi import Request

@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
app.include_router(settings.router)
app.include_router(guest_auth.router)
app.include_router(subscribers.router)

@app.on_event("startup")
def on_startup():
    try:
        from create_guest_tables import create_guest_tables
        create_guest_tables()
    except Exception as e:
        print("Error running guest tables startup check:", e)

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
