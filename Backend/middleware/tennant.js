// Multi-tenancy middleware
const tenantMiddleware = (req, res, next) => {
    // Tenant ID extract karo headers se
    req.tenantId = req.headers['x-tenant-id'];
    
    // Public routes jinme tenant ID required nahi hai
    const publicRoutes = [
        '/api/hospitals/register',
        '/api/hospitals/verify/',
        '/health',
        '/'
    ];
    
    // Check if current route is public
    const isPublicRoute = publicRoutes.some(route => {
        if (route.endsWith('/')) {
            return req.path.startsWith(route);
        }
        return req.path === route;
    });
    
    // Agar public route nahi hai aur tenant ID nahi hai to error throw karo
    if (!isPublicRoute && !req.tenantId) {
        return res.status(400).json({ 
            error: 'Tenant ID is required',
            message: 'Please include x-tenant-id header in your request',
            example: {
                'x-tenant-id': 'TABC123'
            }
        });
    }
    
    // Agar tenant ID hai to validate karo format
    if (req.tenantId) {
        // Basic validation - tenant ID should start with T and have at least 4 characters
        if (!req.tenantId.startsWith('T') || req.tenantId.length < 4) {
            return res.status(400).json({
                error: 'Invalid Tenant ID format',
                message: 'Tenant ID should start with T and contain at least 4 characters',
                example: 'TABC123'
            });
        }
        
        // Tenant context set karo request object mein
        req.tenantContext = {
            tenantId: req.tenantId,
            timestamp: new Date().toISOString()
        };
        
        console.log(`🔐 Tenant Access: ${req.tenantId} - ${req.method} ${req.path}`);
    }
    
    next();
};

// Tenant validation for specific routes
const validateTenant = (req, res, next) => {
    if (!req.tenantId) {
        return res.status(400).json({
            error: 'Tenant validation failed',
            message: 'Tenant ID is required for this operation'
        });
    }
    next();
};

module.exports = { tenantMiddleware, validateTenant };