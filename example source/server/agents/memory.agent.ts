import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gets embedding for text using Gemini
 */
export async function getEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
  
  if (!finalApiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(finalApiKey);
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  
  try {
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

/**
 * Memory Agent class for managing memories and embeddings
 */
export class MemoryAgent {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  async getEmbedding(text: string) {
    return getEmbedding(text, this.apiKey);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const finalApiKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    return embeddings;
  }

  /**
   * Finds relevant memories based on similarity to the query
   */
  async findRelevantMemories(query: string, memoryPool: Array<{ content: string; embedding: string }>, topK: number = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    
    // Calculate cosine similarity between query and all memories
    const similarities = memoryPool.map(memory => {
      const memoryEmbedding = JSON.parse(memory.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
      return {
        ...memory,
        similarity
      };
    });

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculates cosine similarity between two vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, val, idx) => sum + val * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}