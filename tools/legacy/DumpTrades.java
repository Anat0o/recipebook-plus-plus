/*
 * Development helper for the pre-data-driven 1.21.11 snapshot.
 * Compile against the official Mojang-mapped server jar, then redirect stdout
 * to a temporary JSON file consumed by extract-legacy-trades.ts.
 */
package recipebook.tools;

import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Map;
import java.util.Optional;
import org.apache.commons.lang3.tuple.Pair;
import net.minecraft.core.Holder;
import net.minecraft.SharedConstants;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.entity.npc.villager.VillagerProfession;
import net.minecraft.world.entity.npc.villager.VillagerTrades;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.trading.ItemCost;
import net.minecraft.world.level.block.Block;

public final class DumpTrades {
  public static void main(String[] args) throws Exception {
    SharedConstants.tryDetectVersion();
    Bootstrap.bootStrap();
    JsonObject root = new JsonObject();
    JsonObject professions = new JsonObject();
    for (Map.Entry<ResourceKey<VillagerProfession>, Int2ObjectMap<VillagerTrades.ItemListing[]>> profession : VillagerTrades.TRADES.entrySet()) {
      JsonObject levels = new JsonObject();
      for (Int2ObjectMap.Entry<VillagerTrades.ItemListing[]> level : profession.getValue().int2ObjectEntrySet()) {
        JsonArray offers = new JsonArray();
        for (VillagerTrades.ItemListing listing : level.getValue()) offers.add(value(listing));
        levels.add(Integer.toString(level.getIntKey()), offers);
      }
      professions.add(profession.getKey().identifier().getPath(), levels);
    }
    root.add("professions", professions);
    JsonArray wandering = new JsonArray();
    for (Pair<VillagerTrades.ItemListing[], Integer> pool : VillagerTrades.WANDERING_TRADER_TRADES) {
      JsonObject entry = new JsonObject();
      entry.addProperty("picks", pool.getRight());
      JsonArray offers = new JsonArray();
      for (VillagerTrades.ItemListing listing : pool.getLeft()) offers.add(value(listing));
      entry.add("offers", offers);
      wandering.add(entry);
    }
    root.add("wandering", wandering);
    System.out.println("RECIPEBOOK_TRADES=" + new GsonBuilder().create().toJson(root));
  }

  private static JsonElement value(Object input) throws Exception {
    if (input == null) return com.google.gson.JsonNull.INSTANCE;
    if (input instanceof String || input instanceof Number || input instanceof Boolean) return new com.google.gson.Gson().toJsonTree(input);
    if (input instanceof Enum<?> value) return primitive(value.name().toLowerCase());
    if (input instanceof Optional<?> optional) return optional.isPresent() ? value(optional.get()) : com.google.gson.JsonNull.INSTANCE;
    if (input.getClass().isArray()) {
      JsonArray out = new JsonArray();
      int length = java.lang.reflect.Array.getLength(input);
      for (int i = 0; i < length; i++) out.add(value(java.lang.reflect.Array.get(input, i)));
      return out;
    }
    if (input instanceof Item item) return primitive(BuiltInRegistries.ITEM.getKey(item).getPath());
    if (input instanceof Block block) return primitive(BuiltInRegistries.BLOCK.getKey(block).getPath());
    if (input instanceof ItemStack stack) return stack(BuiltInRegistries.ITEM.getKey(stack.getItem()).getPath(), stack.getCount());
    if (input instanceof ItemCost cost) return stack(BuiltInRegistries.ITEM.getKey(cost.item().value()).getPath(), cost.count());
    if (input instanceof Holder<?> holder) return value(holder.value());
    if (input instanceof ResourceKey<?> key) return primitive(key.identifier().getPath());
    if (input instanceof Map<?, ?> map) {
      JsonObject out = new JsonObject();
      for (Map.Entry<?, ?> entry : map.entrySet()) out.add(key(entry.getKey()), value(entry.getValue()));
      return out;
    }
    if (input instanceof Iterable<?> iterable) {
      JsonArray out = new JsonArray();
      for (Object entry : iterable) out.add(value(entry));
      return out;
    }
    JsonObject out = new JsonObject();
    out.addProperty("kind", input.getClass().getSimpleName());
    for (Field field : input.getClass().getDeclaredFields()) {
      if (Modifier.isStatic(field.getModifiers())) continue;
      field.setAccessible(true);
      out.add(field.getName(), value(field.get(input)));
    }
    return out;
  }

  private static String key(Object input) {
    if (input instanceof ResourceKey<?> resource) return resource.identifier().getPath();
    return String.valueOf(input);
  }

  private static JsonElement primitive(String value) { return new com.google.gson.JsonPrimitive(value); }
  private static JsonObject stack(String id, int count) {
    JsonObject out = new JsonObject(); out.addProperty("id", id); out.addProperty("count", count); return out;
  }
}
