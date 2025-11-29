import mongoose from "mongoose";

const tenantConnections = {};

export const getTenantConnection = async (tenantId) => {
  if (tenantConnections[tenantId]) return tenantConnections[tenantId];

  const uri = process.env.MONGO_URI; // main MongoDB URI
  const conn = await mongoose.createConnection(uri, {
    dbName: `tenant_${tenantId}`, // schema-per-tenant
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  tenantConnections[tenantId] = conn;
  return conn;
};
