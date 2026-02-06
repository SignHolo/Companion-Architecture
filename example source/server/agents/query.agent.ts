import { MemoryAgent } from "./memory.agent";
import type { Message, MemoryLog } from "@shared/schema";
import { storage } from "../storage";

export class QueryAgent {
  private memoryAgent: MemoryAgent;

  constructor() {
    this.memoryAgent = new MemoryAgent();
  }

  public async queryMessages(query: string, apiKey: string): Promise<Message[]> {
    this.memoryAgent = new MemoryAgent(apiKey);

    // Get all messages to search through
    const allMessages = await storage.getAllMessages();

    if (allMessages.length === 0) {
      return [];
    }

    console.log(`[QueryAgent] Starting query for: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    console.log(`[QueryAgent] Total messages in database: ${allMessages.length}`);

    // Perform keyword-based search (which already handles the complex logic)
    const keywordBasedResults = await this.keywordSearch(query, allMessages);
    console.log(`[QueryAgent] Keyword-based search returned: ${keywordBasedResults.length} messages`);

    // Perform semantic search for additional context
    const semanticSearchResults = await this.semanticSearch(query, allMessages);
    console.log(`[QueryAgent] Semantic search returned: ${semanticSearchResults.length} messages`);

    // Combine and deduplicate results, prioritizing keyword matches
    const combinedResults = [...keywordBasedResults];

    // Add semantic results that aren't already in keyword results
    const existingIds = new Set(combinedResults.map(m => m.id));
    let addedFromSemantic = 0;
    for (const message of semanticSearchResults) {
      if (!existingIds.has(message.id)) {
        combinedResults.push(message);
        addedFromSemantic++;
      }
    }

    console.log(`[QueryAgent] Added ${addedFromSemantic} unique messages from semantic search`);
    console.log(`[QueryAgent] Total unique messages before final limit: ${combinedResults.length}`);

    // Apply final limit and return
    const finalResults = combinedResults.slice(0, 100);
    console.log(`[QueryAgent] Final result count: ${finalResults.length} messages`);

    return finalResults;
  }

  private async keywordSearch(query: string, allMessages: Message[]): Promise<Message[]> {
    // Extract keywords from the query (simple approach - could be enhanced with NLP)
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      return [];
    }

    // Determine limit based on number of keywords
    const keywordLimit = keywords.length < 5 ? 15 : 10;

    // Find messages for each keyword separately to ensure variety
    const allKeywordMatches = new Map<string, Message[]>(); // keyword -> messages map

    for (const keyword of keywords) {
      const matches = allMessages.filter(message => {
        const lowerContent = message.content.toLowerCase();
        return lowerContent.includes(keyword.toLowerCase());
      });

      // Sort by relevance (length of message as a simple heuristic - shorter more specific)
      const sortedMatches = matches.sort((a, b) => a.content.length - b.content.length);

      // Take the top matches for this keyword
      allKeywordMatches.set(keyword, sortedMatches.slice(0, keywordLimit));
    }

    // Collect all unique messages across all keywords
    const uniqueMessages = new Map<string, Message>(); // messageId -> Message

    for (const [keyword, matches] of allKeywordMatches) {
      for (const message of matches) {
        // Ensure each message is only added once, even if it matches multiple keywords
        if (!uniqueMessages.has(message.id)) {
          uniqueMessages.set(message.id, message);
        }
      }
    }

    return Array.from(uniqueMessages.values());
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP techniques
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'
    ]);

    // Extract words (remove punctuation and split)
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Return unique keywords
    return [...new Set(words)];
  }

  private async semanticSearch(query: string, allMessages: Message[]): Promise<Message[]> {
    try {
      // Use semantic search to find relevant messages
      const queryEmbedding = await this.memoryAgent.getEmbedding(query);
      const messageEmbeddings = await this.memoryAgent.getEmbeddings(allMessages.map(m => m.content));

      const similarities = allMessages.map((message, i) => ({
        message,
        similarity: this.memoryAgent.cosineSimilarity(queryEmbedding, messageEmbeddings[i]),
      }));

      // Sort by similarity and return top results (without altering the original messages)
      const SIMILARITY_THRESHOLD = 0.1; // Very low threshold to get more results
      const relevantMessages = similarities
        .filter(s => s.similarity > SIMILARITY_THRESHOLD)
        .sort((a, b) => b.similarity - a.similarity)
        .map(s => s.message);

      // Return up to 15 most relevant messages (leaving room for keyword matches)
      return relevantMessages.slice(0, 15);
    } catch (error) {
      console.error("Semantic search failed, falling back to keyword search:", error);
      return []; // Return empty array, keyword search will provide results
    }
  }

}
