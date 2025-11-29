// Tenant-specific database operations
const getTenantModel = (modelName, tenantId) => {
    const collectionName = `${modelName}_${tenantId}`;
    // Yahan hum dynamically collection name generate karenge
    return collectionName;
  };
  
  // Tenant-specific connection (agar separate databases chahiye to)
  const getTenantConnection = (tenantId) => {
    // Real implementation mein yahan different database connections ban sakte hain
    // But hum collection-level isolation use karenge for simplicity
    return mongoose.connection;
  };
  
  module.exports = { getTenantModel, getTenantConnection };