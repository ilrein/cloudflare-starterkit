import { Session } from '@shopify/shopify-api';
import { SessionStorage } from '@shopify/shopify-app-remix/server';
import { eq } from 'drizzle-orm';
import { DatabaseClient } from './client';
import { sessions } from './schema';

/**
 * Drizzle-based session storage adapter for Shopify Apps
 * Compatible with both SQLite (development) and D1 (production)
 */
export class DrizzleSessionStorage implements SessionStorage {
  private db: DatabaseClient | null = null;

  constructor(private createDb: () => DatabaseClient) {
    // Don't initialize database client in constructor - do it lazily
  }

  private getDb(): DatabaseClient {
    if (!this.db) {
      this.db = this.createDb();
    }
    return this.db;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const result = await this.getDb()
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      if (result.length === 0) {
        return undefined;
      }

      const sessionData = result[0];
      
      // Convert database record to Shopify Session format
      const session = new Session({
        id: sessionData.id,
        shop: sessionData.shop,
        state: sessionData.state,
        isOnline: sessionData.isOnline,
        scope: sessionData.scope || undefined,
        expires: sessionData.expires ? new Date(sessionData.expires) : undefined,
        accessToken: sessionData.accessToken,
        userId: sessionData.userId ? BigInt(sessionData.userId) : undefined,
        firstName: sessionData.firstName || undefined,
        lastName: sessionData.lastName || undefined,
        email: sessionData.email || undefined,
        accountOwner: sessionData.accountOwner,
        locale: sessionData.locale || undefined,
        collaborator: sessionData.collaborator || undefined,
        emailVerified: sessionData.emailVerified || undefined,
      });

      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      return undefined;
    }
  }

  async storeSession(session: Session): Promise<boolean> {
    try {
      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline,
        scope: session.scope || null,
        expires: session.expires ? session.expires.toISOString() : null,
        accessToken: session.accessToken,
        userId: session.userId ? Number(session.userId) : null,
        firstName: session.firstName || null,
        lastName: session.lastName || null,
        email: session.email || null,
        accountOwner: session.accountOwner,
        locale: session.locale || null,
        collaborator: session.collaborator || null,
        emailVerified: session.emailVerified || null,
      };

      // Use INSERT OR REPLACE for upsert functionality
      await this.getDb()
        .insert(sessions)
        .values(sessionData)
        .onConflictDoUpdate({
          target: sessions.id,
          set: sessionData,
        });

      return true;
    } catch (error) {
      console.error('Error storing session:', error);
      return false;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await this.getDb()
        .delete(sessions)
        .where(eq(sessions.id, id));

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      // Delete sessions in batches if needed
      for (const id of ids) {
        await this.deleteSession(id);
      }
      return true;
    } catch (error) {
      console.error('Error deleting sessions:', error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const results = await this.getDb()
        .select()
        .from(sessions)
        .where(eq(sessions.shop, shop));

      return results.map(sessionData => new Session({
        id: sessionData.id,
        shop: sessionData.shop,
        state: sessionData.state,
        isOnline: sessionData.isOnline,
        scope: sessionData.scope || undefined,
        expires: sessionData.expires ? new Date(sessionData.expires) : undefined,
        accessToken: sessionData.accessToken,
        userId: sessionData.userId ? BigInt(sessionData.userId) : undefined,
        firstName: sessionData.firstName || undefined,
        lastName: sessionData.lastName || undefined,
        email: sessionData.email || undefined,
        accountOwner: sessionData.accountOwner,
        locale: sessionData.locale || undefined,
        collaborator: sessionData.collaborator || undefined,
        emailVerified: sessionData.emailVerified || undefined,
      }));
    } catch (error) {
      console.error('Error finding sessions by shop:', error);
      return [];
    }
  }
}