# Strategy Pattern - Pseudo-Code Example

## Correct Implementation

Strategy pattern with interface and concrete strategies:

```pseudo
// Strategy interface
interface CompressionStrategy {
  function compress(data)
}

// Concrete strategies
class ZipCompression implements CompressionStrategy {
  function compress(data) {
    // ZIP compression logic
    print("Compressing with ZIP algorithm")
    return compressedData
  }
}

class GzipCompression implements CompressionStrategy {
  function compress(data) {
    // GZIP compression logic
    print("Compressing with GZIP algorithm")
    return compressedData
  }
}

// Context that uses strategy
class FileCompressor {
  strategy

  constructor(strategy) {
    this.strategy = strategy
  }

  function setStrategy(strategy) {
    this.strategy = strategy
  }

  function compressFile(data) {
    return strategy.compress(data)
  }
}

// Usage
compressor = new FileCompressor(new ZipCompression())
compressor.compressFile(fileData)

// Change strategy at runtime
compressor.setStrategy(new GzipCompression())
compressor.compressFile(fileData)
```

## Incorrect Implementation

Hard-coded algorithms with conditional logic:

```pseudo
// Conditional logic instead of strategy pattern
class FileCompressor {
  function compressFile(data, compressionType) {
    // Using if/else to select algorithm
    if (compressionType == "zip") {
      // ZIP compression logic inline
      print("Using ZIP")
      return compressWithZip(data)
    } else if (compressionType == "gzip") {
      // GZIP compression logic inline
      print("Using GZIP")
      return compressWithGzip(data)
    } else if (compressionType == "bzip2") {
      // BZIP2 compression logic inline
      print("Using BZIP2")
      return compressWithBzip2(data)
    } else {
      throw Error("Unknown compression type")
    }
  }

  private function compressWithZip(data) { }
  private function compressWithGzip(data) { }
  private function compressWithBzip2(data) { }
}

// Usage - must pass string identifier
compressor = new FileCompressor()
compressor.compressFile(data, "zip")
```

## Why the Incorrect Version is Bad

1. **Violates Open/Closed**: Adding new compression types requires modifying the class
2. **No Runtime Flexibility**: Cannot change algorithm after creation
3. **Tight Coupling**: All algorithms embedded in one class
4. **Hard to Test**: Cannot test algorithms independently
5. **String-Based Selection**: Type-unsafe, prone to typos
6. **Single Responsibility Violation**: Class handles all compression algorithms
7. **Code Duplication**: Similar conditional logic repeated throughout codebase

## Checklist

- [ ] Strategy interface defines algorithm contract
- [ ] Each algorithm is a separate class
- [ ] Context holds strategy reference
- [ ] Strategy can be injected and changed at runtime

## Key Takeaways

- Use interface to define strategy contract
- Implement each algorithm as separate class
- Context holds strategy reference, not algorithm code
- Allow strategy to be injected and changed at runtime
- Eliminates conditional logic for algorithm selection
- Each strategy is independently testable
- Easy to add new strategies without modifying existing code
- Promotes Open/Closed Principle and composition over conditionals
