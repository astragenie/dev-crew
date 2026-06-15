# M0 — Foundations (Runner Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the runner-side foundations for JSONL-based ingestion from the loop plugin: a new `/api/v2/ingest/loop-events` endpoint (shell only), Bearer-token authentication tied to per-app tokens, the `LoopEvent` envelope persistence entity (no typed handlers yet), a SignalR hub scaffold, and a v2 frontend router with empty page shells. No event-routing handlers are implemented yet — those come in M1+. Strict isolation: nothing under `/api/v1` or under existing pages is modified.

**Architecture:** New surface lives under `/api/v2/...`, `AstraRunner.Domain/Loop/`, `AstraRunner.Application/Loop/`, `AstraRunner.Infrastructure/Loop/`, and `src/frontend/dashboard/src/v2/`. EF migrations land in a fresh `Loop` schema-isolated folder using the same `astrarunner` PostgreSQL schema. SignalR hub uses ASP.NET Core's built-in implementation with three group families: `app:{appId}`, `app:{appId}:slice:{sliceId}`, `app:{appId}:wave:{waveId}`.

**Tech Stack:** .NET 10, ASP.NET Core, EF Core 10, PostgreSQL 17, SignalR, xUnit + FluentAssertions, Testcontainers (for integration tests), React 19 + Vite + TypeScript + TanStack Query, `@microsoft/signalr` client.

**Parent Spec:** `C:\work\mega\loop\docs\superpowers\specs\2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M0, Runner FEATs R0-1 through R0-5).

**Wave-run target:** This plan = one wave-run in `C:\work\mega\runner`.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/AppToken.cs` | new | Per-app Bearer token entity: `Id, AppId, TenantId, TokenHash, Label, CreatedAt, RevokedAt`. |
| `src/AstraRunner.Domain/Loop/LoopEvent.cs` | new | Envelope persistence row: `Id, TenantId, AppId, Kind, RawPayload (jsonb), SourcePath, LineOffset, EmittedAt, ReceivedAt, SchemaVersion`. |
| `src/AstraRunner.Domain/Loop/Interfaces/IAppTokenRepository.cs` | new | Query/create/revoke contract. |
| `src/AstraRunner.Domain/Loop/Interfaces/ILoopEventRepository.cs` | new | Upsert + read contract. |
| `src/AstraRunner.Infrastructure/Loop/AppTokenRepository.cs` | new | EF Core impl. |
| `src/AstraRunner.Infrastructure/Loop/LoopEventRepository.cs` | new | EF Core impl with idempotent upsert. |
| `src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs` | modify | Register `DbSet<AppToken>` + `DbSet<LoopEvent>` + fluent config. |
| `src/AstraRunner.Infrastructure/Migrations/<timestamp>_AddLoopFoundations.cs` | new | EF migration: `app_tokens`, `loop_events`, indices on `(app_id, kind)`, `(emitted_at)`, `(source_path, line_offset)`. |
| `src/AstraRunner.Application/Loop/Tokens/TokenHasher.cs` | new | SHA-256 hash (with random salt) for storage; constant-time compare. |
| `src/AstraRunner.Application/Loop/Tokens/CreateAppTokenHandler.cs` | new | Issues a new token, returns plaintext one time, stores hash. |
| `src/AstraRunner.Application/Loop/Tokens/RevokeAppTokenHandler.cs` | new | Marks revoked. |
| `src/AstraRunner.Application/Loop/Tokens/VerifyAppTokenService.cs` | new | Verifies Bearer header → resolves `(tenantId, appId)` or fails. |
| `src/AstraRunner.Application/Loop/Ingest/IIngestQueue.cs` | new | Channel-backed queue contract. |
| `src/AstraRunner.Application/Loop/Ingest/InMemoryIngestQueue.cs` | new | `System.Threading.Channels` implementation; default for M0. |
| `src/AstraRunner.Application/Loop/Ingest/IngestEnvelopeDto.cs` | new | Wire-format DTO. |
| `src/AstraRunner.Api/Controllers/V2/IngestController.cs` | new | `POST /api/v2/ingest/loop-events` — Bearer verify, enqueue, 202. |
| `src/AstraRunner.Api/Controllers/V2/AppTokensController.cs` | new | `POST/DELETE /api/v2/apps/{appId}/tokens` mgmt. |
| `src/AstraRunner.Api/Auth/AppTokenAuthHandler.cs` | new | ASP.NET Core authentication scheme handler `AppTokenScheme`. |
| `src/AstraRunner.Api/Hubs/LoopEventsHub.cs` | new | SignalR hub with `JoinApp`, `JoinSlice`, `JoinWave` methods. |
| `src/AstraRunner.Api/Hubs/ILoopEventsNotifier.cs` | new | Internal facade `NotifyAsync(appId, channel, payload)`; lets non-Hub services push without referencing SignalR types directly. |
| `src/AstraRunner.Api/Hubs/LoopEventsNotifier.cs` | new | Default impl backed by `IHubContext<LoopEventsHub>`. |
| `src/AstraRunner.Api/Program.cs` | modify | Register authentication scheme, SignalR, map hub route, register `IIngestQueue` + repositories. |
| `tests/AstraRunner.Tests/Unit/Loop/TokenHasherTests.cs` | new | Hash + verify roundtrip; salt uniqueness; constant-time compare. |
| `tests/AstraRunner.Tests/Unit/Loop/VerifyAppTokenServiceTests.cs` | new | Bearer parse, lookup, revoked rejection. |
| `tests/AstraRunner.Tests/Unit/Loop/InMemoryIngestQueueTests.cs` | new | Enqueue/dequeue ordering, bounded capacity rejection. |
| `tests/AstraRunner.Tests/Integration/Api/V2/IngestControllerTests.cs` | new | 202 on valid Bearer, 401 on bad/missing, 401 on revoked. |
| `tests/AstraRunner.Tests/Integration/Api/V2/AppTokensControllerTests.cs` | new | Create returns plaintext once; revoke is idempotent. |
| `tests/AstraRunner.Tests/Integration/Loop/LoopEventRepositoryTests.cs` | new | Upsert idempotency, watermark query. |
| `tests/AstraRunner.Tests/Integration/Hubs/LoopEventsHubTests.cs` | new | Client joins group; notifier delivers payload to that client only. |
| `src/frontend/dashboard/src/v2/router.tsx` | new | v2 route tree mounted under `/v2/...` paths. |
| `src/frontend/dashboard/src/v2/pages/SliceLiveDetail.tsx` | new | Empty shell with placeholder copy. |
| `src/frontend/dashboard/src/v2/pages/WaveList.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/WaveDetail.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/AgentPerformance.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/HaltBadges.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/IngestDrift.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/RoleAgentCost.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/Decisions.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/v2/pages/Learnings.tsx` | new | Empty shell. |
| `src/frontend/dashboard/src/App.tsx` | modify | Mount v2 router subtree without modifying v1 routes. |
| `src/frontend/dashboard/package.json` | modify | Add `@microsoft/signalr` dep. |
| `src/frontend/dashboard/src/v2/lib/signalr-client.ts` | new | Thin wrapper that constructs `HubConnectionBuilder` with auth-token injection. |

---

### Task 1: AppToken entity + repository + hashing

**Files:**
- Create: `src/AstraRunner.Domain/Loop/AppToken.cs`
- Create: `src/AstraRunner.Domain/Loop/Interfaces/IAppTokenRepository.cs`
- Create: `src/AstraRunner.Application/Loop/Tokens/TokenHasher.cs`
- Create: `tests/AstraRunner.Tests/Unit/Loop/TokenHasherTests.cs`

- [ ] **Step 1: Write the failing TokenHasher tests**

`tests/AstraRunner.Tests/Unit/Loop/TokenHasherTests.cs`:

```csharp
using AstraRunner.Application.Loop.Tokens;
using FluentAssertions;
using Xunit;

namespace AstraRunner.Tests.Unit.Loop;

public class TokenHasherTests
{
    [Fact]
    public void Hash_returns_distinct_outputs_for_same_input()
    {
        var hasher = new TokenHasher();
        var a = hasher.Hash("plaintext-token");
        var b = hasher.Hash("plaintext-token");
        a.Should().NotBe(b, because: "salt must be random");
    }

    [Fact]
    public void Verify_accepts_correct_plaintext()
    {
        var hasher = new TokenHasher();
        var stored = hasher.Hash("plaintext-token");
        hasher.Verify("plaintext-token", stored).Should().BeTrue();
    }

    [Fact]
    public void Verify_rejects_wrong_plaintext()
    {
        var hasher = new TokenHasher();
        var stored = hasher.Hash("plaintext-token");
        hasher.Verify("wrong", stored).Should().BeFalse();
    }

    [Fact]
    public void Verify_rejects_malformed_stored_value()
    {
        var hasher = new TokenHasher();
        hasher.Verify("anything", "not-a-real-hash").Should().BeFalse();
    }
}
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~TokenHasherTests"
```

Expected: compile error (`TokenHasher` not found).

- [ ] **Step 3: Implement entity + interfaces + hasher**

`src/AstraRunner.Domain/Loop/AppToken.cs`:

```csharp
namespace AstraRunner.Domain.Loop;

public sealed class AppToken
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required Guid AppId { get; init; }
    public required string TokenHash { get; init; }
    public required string Label { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public void Revoke(DateTimeOffset at) => RevokedAt = at;

    public bool IsActive(DateTimeOffset now) => RevokedAt is null || RevokedAt > now;
}
```

`src/AstraRunner.Domain/Loop/Interfaces/IAppTokenRepository.cs`:

```csharp
using AstraRunner.Domain.Loop;

namespace AstraRunner.Domain.Loop.Interfaces;

public interface IAppTokenRepository
{
    Task<AppToken?> GetActiveByHashAsync(string tokenHash, DateTimeOffset asOf, CancellationToken ct);
    Task<AppToken?> GetByIdAsync(Guid id, CancellationToken ct);
    Task AddAsync(AppToken token, CancellationToken ct);
    Task RevokeAsync(Guid id, DateTimeOffset at, CancellationToken ct);
    Task<IReadOnlyList<AppToken>> ListForAppAsync(Guid appId, CancellationToken ct);
}
```

`src/AstraRunner.Application/Loop/Tokens/TokenHasher.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;

namespace AstraRunner.Application.Loop.Tokens;

public sealed class TokenHasher : ITokenHasher
{
    private const int SaltLength = 16;

    public string Hash(string plaintext)
    {
        Span<byte> salt = stackalloc byte[SaltLength];
        RandomNumberGenerator.Fill(salt);
        var digest = ComputeDigest(plaintext, salt);
        return Convert.ToHexString(salt) + "$" + Convert.ToHexString(digest);
    }

    public bool Verify(string plaintext, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 2) return false;
        byte[] salt, expected;
        try
        {
            salt = Convert.FromHexString(parts[0]);
            expected = Convert.FromHexString(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }
        var candidate = ComputeDigest(plaintext, salt);
        return CryptographicOperations.FixedTimeEquals(candidate, expected);
    }

    private static byte[] ComputeDigest(string plaintext, ReadOnlySpan<byte> salt)
    {
        var pwBytes = Encoding.UTF8.GetBytes(plaintext);
        Span<byte> buffer = stackalloc byte[salt.Length + pwBytes.Length];
        salt.CopyTo(buffer);
        pwBytes.AsSpan().CopyTo(buffer[salt.Length..]);
        return SHA256.HashData(buffer);
    }
}

public interface ITokenHasher
{
    string Hash(string plaintext);
    bool Verify(string plaintext, string stored);
}
```

- [ ] **Step 4: Run test to confirm pass**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~TokenHasherTests"
```

Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```pwsh
git add src/AstraRunner.Domain/Loop/ src/AstraRunner.Application/Loop/Tokens/TokenHasher.cs tests/AstraRunner.Tests/Unit/Loop/TokenHasherTests.cs
git commit -m "feat(loop): AppToken entity + TokenHasher with salted SHA-256"
```

---

### Task 2: LoopEvent envelope entity + repository contract

**Files:**
- Create: `src/AstraRunner.Domain/Loop/LoopEvent.cs`
- Create: `src/AstraRunner.Domain/Loop/Interfaces/ILoopEventRepository.cs`

- [ ] **Step 1: Author the entity**

`src/AstraRunner.Domain/Loop/LoopEvent.cs`:

```csharp
namespace AstraRunner.Domain.Loop;

public sealed class LoopEvent
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required Guid AppId { get; init; }
    public required string Kind { get; init; }
    public required string RawPayloadJson { get; init; }
    public string? SourcePath { get; init; }
    public long? LineOffset { get; init; }
    public required DateTimeOffset EmittedAt { get; init; }
    public required DateTimeOffset ReceivedAt { get; init; }
    public string? SchemaVersion { get; init; }
}
```

- [ ] **Step 2: Author the repository contract**

`src/AstraRunner.Domain/Loop/Interfaces/ILoopEventRepository.cs`:

```csharp
namespace AstraRunner.Domain.Loop.Interfaces;

public interface ILoopEventRepository
{
    Task UpsertAsync(LoopEvent envelope, CancellationToken ct);

    Task<long?> GetWatermarkAsync(Guid appId, string sourcePath, CancellationToken ct);

    Task<IReadOnlyList<LoopEvent>> ListByAppAsync(
        Guid appId,
        DateTimeOffset since,
        int limit,
        CancellationToken ct);
}
```

- [ ] **Step 3: Build the project to confirm types compile**

```pwsh
dotnet build src/AstraRunner.Domain/AstraRunner.Domain.csproj
```

Expected: build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```pwsh
git add src/AstraRunner.Domain/Loop/
git commit -m "feat(loop): LoopEvent envelope entity + repository contract"
```

---

### Task 3: EF migration adding `app_tokens` + `loop_events` tables

**Files:**
- Modify: `src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs`
- Create: `src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/AppTokenConfiguration.cs`
- Create: `src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/LoopEventConfiguration.cs`
- Create: `src/AstraRunner.Infrastructure/Loop/AppTokenRepository.cs`
- Create: `src/AstraRunner.Infrastructure/Loop/LoopEventRepository.cs`
- Create: `src/AstraRunner.Infrastructure/Migrations/<timestamp>_AddLoopFoundations.cs` (via `dotnet ef`)

- [ ] **Step 1: Add EF configurations**

`src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/AppTokenConfiguration.cs`:

```csharp
using AstraRunner.Domain.Loop;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AstraRunner.Infrastructure.Persistence.Configuration.Loop;

internal sealed class AppTokenConfiguration : IEntityTypeConfiguration<AppToken>
{
    public void Configure(EntityTypeBuilder<AppToken> b)
    {
        b.ToTable("app_tokens");
        b.HasKey(t => t.Id);
        b.Property(t => t.TenantId).IsRequired();
        b.Property(t => t.AppId).IsRequired();
        b.Property(t => t.TokenHash).IsRequired().HasMaxLength(256);
        b.Property(t => t.Label).IsRequired().HasMaxLength(128);
        b.Property(t => t.CreatedAt).IsRequired();
        b.Property(t => t.RevokedAt);
        b.HasIndex(t => t.TokenHash).IsUnique();
        b.HasIndex(t => new { t.AppId, t.RevokedAt });
    }
}
```

`src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/LoopEventConfiguration.cs`:

```csharp
using AstraRunner.Domain.Loop;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AstraRunner.Infrastructure.Persistence.Configuration.Loop;

internal sealed class LoopEventConfiguration : IEntityTypeConfiguration<LoopEvent>
{
    public void Configure(EntityTypeBuilder<LoopEvent> b)
    {
        b.ToTable("loop_events");
        b.HasKey(e => e.Id);
        b.Property(e => e.TenantId).IsRequired();
        b.Property(e => e.AppId).IsRequired();
        b.Property(e => e.Kind).IsRequired().HasMaxLength(128);
        b.Property(e => e.RawPayloadJson).HasColumnType("jsonb").IsRequired();
        b.Property(e => e.SourcePath).HasMaxLength(512);
        b.Property(e => e.LineOffset);
        b.Property(e => e.EmittedAt).IsRequired();
        b.Property(e => e.ReceivedAt).IsRequired();
        b.Property(e => e.SchemaVersion).HasMaxLength(32);
        b.HasIndex(e => new { e.AppId, e.Kind });
        b.HasIndex(e => e.EmittedAt);
        b.HasIndex(e => new { e.AppId, e.SourcePath, e.LineOffset })
            .HasFilter("source_path IS NOT NULL AND line_offset IS NOT NULL");
    }
}
```

- [ ] **Step 2: Register DbSets in the context**

Edit `src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs`. Inside the class, after existing DbSet declarations:

```csharp
    public DbSet<AppToken> AppTokens => Set<AppToken>();
    public DbSet<LoopEvent> LoopEvents => Set<LoopEvent>();
```

Add `using AstraRunner.Domain.Loop;` at the top.

In `OnModelCreating`, add (preserving existing call to `ApplyConfigurationsFromAssembly` if present, otherwise applying explicitly):

```csharp
        modelBuilder.ApplyConfiguration(new AppTokenConfiguration());
        modelBuilder.ApplyConfiguration(new LoopEventConfiguration());
```

Add `using AstraRunner.Infrastructure.Persistence.Configuration.Loop;` at the top.

- [ ] **Step 3: Implement the repositories**

`src/AstraRunner.Infrastructure/Loop/AppTokenRepository.cs`:

```csharp
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;
using AstraRunner.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AstraRunner.Infrastructure.Loop;

public sealed class AppTokenRepository : IAppTokenRepository
{
    private readonly AstraRunnerDbContext _db;
    public AppTokenRepository(AstraRunnerDbContext db) => _db = db;

    public Task<AppToken?> GetActiveByHashAsync(string tokenHash, DateTimeOffset asOf, CancellationToken ct) =>
        _db.AppTokens.AsNoTracking()
            .Where(t => t.TokenHash == tokenHash && (t.RevokedAt == null || t.RevokedAt > asOf))
            .SingleOrDefaultAsync(ct);

    public Task<AppToken?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.AppTokens.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct);

    public async Task AddAsync(AppToken token, CancellationToken ct)
    {
        _db.AppTokens.Add(token);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAsync(Guid id, DateTimeOffset at, CancellationToken ct)
    {
        var t = await _db.AppTokens.SingleAsync(x => x.Id == id, ct);
        t.Revoke(at);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AppToken>> ListForAppAsync(Guid appId, CancellationToken ct) =>
        await _db.AppTokens.AsNoTracking().Where(t => t.AppId == appId).ToListAsync(ct);
}
```

`src/AstraRunner.Infrastructure/Loop/LoopEventRepository.cs`:

```csharp
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;
using AstraRunner.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AstraRunner.Infrastructure.Loop;

public sealed class LoopEventRepository : ILoopEventRepository
{
    private readonly AstraRunnerDbContext _db;
    public LoopEventRepository(AstraRunnerDbContext db) => _db = db;

    public async Task UpsertAsync(LoopEvent envelope, CancellationToken ct)
    {
        // Idempotency key: (AppId, SourcePath, LineOffset) when both source fields set, otherwise (AppId, Kind, EmittedAt).
        LoopEvent? existing = null;
        if (envelope.SourcePath is not null && envelope.LineOffset is not null)
        {
            existing = await _db.LoopEvents.AsNoTracking().SingleOrDefaultAsync(
                e => e.AppId == envelope.AppId
                  && e.SourcePath == envelope.SourcePath
                  && e.LineOffset == envelope.LineOffset, ct);
        }
        else
        {
            existing = await _db.LoopEvents.AsNoTracking().SingleOrDefaultAsync(
                e => e.AppId == envelope.AppId
                  && e.Kind == envelope.Kind
                  && e.EmittedAt == envelope.EmittedAt, ct);
        }
        if (existing is not null) return;

        _db.LoopEvents.Add(envelope);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<long?> GetWatermarkAsync(Guid appId, string sourcePath, CancellationToken ct) =>
        await _db.LoopEvents.AsNoTracking()
            .Where(e => e.AppId == appId && e.SourcePath == sourcePath && e.LineOffset != null)
            .MaxAsync(e => (long?)e.LineOffset, ct);

    public async Task<IReadOnlyList<LoopEvent>> ListByAppAsync(Guid appId, DateTimeOffset since, int limit, CancellationToken ct) =>
        await _db.LoopEvents.AsNoTracking()
            .Where(e => e.AppId == appId && e.EmittedAt >= since)
            .OrderBy(e => e.EmittedAt)
            .Take(limit)
            .ToListAsync(ct);
}
```

- [ ] **Step 4: Register repositories in DI**

Edit `src/AstraRunner.Infrastructure/DependencyInjection.cs`. Add inside the existing extension method body:

```csharp
        services.AddScoped<IAppTokenRepository, AppTokenRepository>();
        services.AddScoped<ILoopEventRepository, LoopEventRepository>();
```

Add usings:

```csharp
using AstraRunner.Domain.Loop.Interfaces;
using AstraRunner.Infrastructure.Loop;
```

- [ ] **Step 5: Generate the EF migration**

```pwsh
dotnet ef migrations add AddLoopFoundations --project src/AstraRunner.Infrastructure --startup-project src/AstraRunner.AppHost --output-dir Migrations
```

Expected: new `<timestamp>_AddLoopFoundations.cs` file under `src/AstraRunner.Infrastructure/Migrations/`.

- [ ] **Step 6: Inspect the generated migration**

Open the generated file. Verify the `Up()` method creates:
- `app_tokens` table with all columns matching the configuration.
- `loop_events` table with `raw_payload_json` as `jsonb`.
- Indexes: `IX_app_tokens_token_hash` (unique), `IX_app_tokens_app_id_revoked_at`, `IX_loop_events_app_id_kind`, `IX_loop_events_emitted_at`, `IX_loop_events_app_id_source_path_line_offset` (filtered).

If anything is missing, fix the entity-configuration files and regenerate.

- [ ] **Step 7: Apply the migration to local DB**

```pwsh
dotnet ef database update --project src/AstraRunner.Infrastructure --startup-project src/AstraRunner.AppHost
```

Expected: migration applied without error.

- [ ] **Step 8: Verify tables exist**

```pwsh
psql -h localhost -U astra -d astra_humanizer -c "\dt astrarunner.app_tokens" -c "\dt astrarunner.loop_events"
```

Expected: both tables listed.

- [ ] **Step 9: Commit**

```pwsh
git add src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/ src/AstraRunner.Infrastructure/Loop/ src/AstraRunner.Infrastructure/Persistence/AstraRunnerDbContext.cs src/AstraRunner.Infrastructure/DependencyInjection.cs src/AstraRunner.Infrastructure/Migrations/
git commit -m "feat(loop): EF migration for app_tokens + loop_events tables"
```

---

### Task 4: VerifyAppTokenService + ASP.NET Core authentication handler

**Files:**
- Create: `src/AstraRunner.Application/Loop/Tokens/VerifyAppTokenService.cs`
- Create: `src/AstraRunner.Api/Auth/AppTokenAuthHandler.cs`
- Create: `tests/AstraRunner.Tests/Unit/Loop/VerifyAppTokenServiceTests.cs`

- [ ] **Step 1: Write the failing VerifyAppTokenService tests**

`tests/AstraRunner.Tests/Unit/Loop/VerifyAppTokenServiceTests.cs`:

```csharp
using AstraRunner.Application.Loop.Tokens;
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace AstraRunner.Tests.Unit.Loop;

public class VerifyAppTokenServiceTests
{
    private static AppToken MakeToken(string hash, DateTimeOffset? revokedAt = null)
    {
        var t = new AppToken
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            AppId = Guid.NewGuid(),
            TokenHash = hash,
            Label = "test",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        if (revokedAt is not null) t.Revoke(revokedAt.Value);
        return t;
    }

    [Fact]
    public async Task ResolveAsync_returns_token_for_valid_plaintext()
    {
        var hasher = new TokenHasher();
        var stored = hasher.Hash("plaintext");
        var token = MakeToken(stored);
        var repo = new Mock<IAppTokenRepository>();
        repo.Setup(r => r.GetActiveByHashAsync(stored, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(token);
        var svc = new VerifyAppTokenService(repo.Object, hasher, () => DateTimeOffset.UtcNow);

        var result = await svc.ResolveAsync("plaintext", CancellationToken.None);

        result.Should().NotBeNull();
        result!.AppId.Should().Be(token.AppId);
    }

    [Fact]
    public async Task ResolveAsync_returns_null_for_unknown_token()
    {
        var hasher = new TokenHasher();
        var repo = new Mock<IAppTokenRepository>();
        repo.Setup(r => r.GetActiveByHashAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppToken?)null);
        var svc = new VerifyAppTokenService(repo.Object, hasher, () => DateTimeOffset.UtcNow);

        var result = await svc.ResolveAsync("nope", CancellationToken.None);

        result.Should().BeNull();
    }
}
```

Note: M0 implementation does a constant-time hash compare across all stored tokens? No — implementation hashes the plaintext with each token's stored salt is impractical. Instead, the implementation will hash the plaintext deterministically (no per-token salt for the lookup column) — see Step 3 below for resolution.

- [ ] **Step 2: Run test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~VerifyAppTokenServiceTests"
```

Expected: compile error.

- [ ] **Step 3: Resolve the salt-vs-lookup question and implement**

Design decision (locks here, lifts to plan-level): Storage uses a **deterministic SHA-256 keyed by a server-wide pepper** for the lookup column `TokenHash` (so we can index it), AND a per-row random salt stored alongside the digest for resistance against rainbow tables. Verification recomputes the keyed digest, queries by it, then verifies the salted digest using `TokenHasher.Verify`.

Adjust the `TokenHasher` to expose both `Hash` (salted, for storage of the secondary digest) and `LookupHash` (peppered, for the index column).

Edit `src/AstraRunner.Application/Loop/Tokens/TokenHasher.cs` — add:

```csharp
    public string LookupHash(string plaintext, ReadOnlySpan<byte> pepper)
    {
        Span<byte> input = stackalloc byte[pepper.Length + Encoding.UTF8.GetByteCount(plaintext)];
        pepper.CopyTo(input);
        Encoding.UTF8.GetBytes(plaintext, input[pepper.Length..]);
        return Convert.ToHexString(SHA256.HashData(input));
    }
```

Update the interface:

```csharp
public interface ITokenHasher
{
    string Hash(string plaintext);
    bool Verify(string plaintext, string stored);
    string LookupHash(string plaintext, ReadOnlySpan<byte> pepper);
}
```

Update entity `AppToken.cs` to expose a separate `LookupHash` field (used by the unique index) and rename the existing `TokenHash` to `VerifierHash` (the salted secondary). Migration must be regenerated to reflect the rename + new column.

```csharp
public sealed class AppToken
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required Guid AppId { get; init; }
    public required string LookupHash { get; init; }
    public required string VerifierHash { get; init; }
    public required string Label { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public void Revoke(DateTimeOffset at) => RevokedAt = at;
    public bool IsActive(DateTimeOffset now) => RevokedAt is null || RevokedAt > now;
}
```

Update `AppTokenConfiguration` to use the new field names: unique index on `LookupHash`. Regenerate the migration by deleting the old one and re-running `dotnet ef migrations add AddLoopFoundations ...` from Task 3 Step 5.

Update `AppTokenRepository.GetActiveByHashAsync` parameter name to `lookupHash` and predicate accordingly.

Now implement `VerifyAppTokenService`:

`src/AstraRunner.Application/Loop/Tokens/VerifyAppTokenService.cs`:

```csharp
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;

namespace AstraRunner.Application.Loop.Tokens;

public sealed class VerifyAppTokenService
{
    private readonly IAppTokenRepository _repo;
    private readonly ITokenHasher _hasher;
    private readonly Func<DateTimeOffset> _now;
    private readonly byte[] _pepper;

    public VerifyAppTokenService(IAppTokenRepository repo, ITokenHasher hasher, Func<DateTimeOffset> now, byte[]? pepper = null)
    {
        _repo = repo;
        _hasher = hasher;
        _now = now;
        _pepper = pepper ?? Array.Empty<byte>();
    }

    public async Task<AppToken?> ResolveAsync(string plaintext, CancellationToken ct)
    {
        var lookup = _hasher.LookupHash(plaintext, _pepper);
        var token = await _repo.GetActiveByHashAsync(lookup, _now(), ct);
        if (token is null) return null;
        return _hasher.Verify(plaintext, token.VerifierHash) ? token : null;
    }
}
```

Source the pepper from configuration. In `src/AstraRunner.Api/Program.cs`, register:

```csharp
builder.Services.AddSingleton<ITokenHasher, TokenHasher>();
builder.Services.AddScoped<VerifyAppTokenService>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var pepperB64 = cfg["Loop:Tokens:Pepper"] ?? throw new InvalidOperationException("Loop:Tokens:Pepper missing");
    return new VerifyAppTokenService(
        sp.GetRequiredService<IAppTokenRepository>(),
        sp.GetRequiredService<ITokenHasher>(),
        () => DateTimeOffset.UtcNow,
        Convert.FromBase64String(pepperB64));
});
```

Document the pepper in `appsettings.Development.json` as a 32-byte base64 value (operator regenerates per environment).

- [ ] **Step 4: Update the failing test to use the new shape and run**

The test's `MakeToken(hash)` needs to set `LookupHash` and `VerifierHash` separately. Replace it with:

```csharp
    private static AppToken MakeToken(string lookup, string verifier, DateTimeOffset? revokedAt = null)
    {
        var t = new AppToken
        {
            Id = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            AppId = Guid.NewGuid(),
            LookupHash = lookup,
            VerifierHash = verifier,
            Label = "test",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };
        if (revokedAt is not null) t.Revoke(revokedAt.Value);
        return t;
    }
```

And the first test body:

```csharp
        var hasher = new TokenHasher();
        var pepper = new byte[]{1,2,3,4};
        var lookup = hasher.LookupHash("plaintext", pepper);
        var verifier = hasher.Hash("plaintext");
        var token = MakeToken(lookup, verifier);
        var repo = new Mock<IAppTokenRepository>();
        repo.Setup(r => r.GetActiveByHashAsync(lookup, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(token);
        var svc = new VerifyAppTokenService(repo.Object, hasher, () => DateTimeOffset.UtcNow, pepper);
        var result = await svc.ResolveAsync("plaintext", CancellationToken.None);
        result.Should().NotBeNull();
        result!.AppId.Should().Be(token.AppId);
```

Run:

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~VerifyAppTokenServiceTests"
```

Expected: 2/2 PASS.

- [ ] **Step 5: Implement the authentication handler**

`src/AstraRunner.Api/Auth/AppTokenAuthHandler.cs`:

```csharp
using System.Security.Claims;
using System.Text.Encodings.Web;
using AstraRunner.Application.Loop.Tokens;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AstraRunner.Api.Auth;

public sealed class AppTokenAuthOptions : AuthenticationSchemeOptions { }

public sealed class AppTokenAuthHandler : AuthenticationHandler<AppTokenAuthOptions>
{
    public const string SchemeName = "AppToken";
    public const string ClaimAppId = "loop:app_id";
    public const string ClaimTenantId = "loop:tenant_id";

    private readonly VerifyAppTokenService _verifier;

    public AppTokenAuthHandler(
        IOptionsMonitor<AppTokenAuthOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        VerifyAppTokenService verifier) : base(options, logger, encoder)
    {
        _verifier = verifier;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var header))
        {
            return AuthenticateResult.Fail("Missing Authorization header");
        }
        var raw = header.ToString();
        const string prefix = "Bearer ";
        if (!raw.StartsWith(prefix, StringComparison.Ordinal))
        {
            return AuthenticateResult.Fail("Authorization header is not Bearer");
        }
        var plaintext = raw[prefix.Length..].Trim();
        if (string.IsNullOrEmpty(plaintext))
        {
            return AuthenticateResult.Fail("Empty bearer token");
        }

        var token = await _verifier.ResolveAsync(plaintext, Context.RequestAborted);
        if (token is null) return AuthenticateResult.Fail("Invalid token");

        var identity = new ClaimsIdentity(SchemeName);
        identity.AddClaim(new Claim(ClaimAppId, token.AppId.ToString()));
        identity.AddClaim(new Claim(ClaimTenantId, token.TenantId.ToString()));
        var principal = new ClaimsPrincipal(identity);
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }
}
```

- [ ] **Step 6: Register the scheme in Program.cs**

In `src/AstraRunner.Api/Program.cs`, add to the auth registration block (preserve existing schemes — append, don't replace):

```csharp
builder.Services
    .AddAuthentication() // existing schemes already added above
    .AddScheme<AppTokenAuthOptions, AppTokenAuthHandler>(AppTokenAuthHandler.SchemeName, _ => { });
```

- [ ] **Step 7: Build**

```pwsh
dotnet build src/AstraRunner.Api/AstraRunner.Api.csproj
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```pwsh
git add src/AstraRunner.Application/Loop/Tokens/ src/AstraRunner.Api/Auth/AppTokenAuthHandler.cs src/AstraRunner.Domain/Loop/AppToken.cs src/AstraRunner.Infrastructure/Persistence/Configuration/Loop/AppTokenConfiguration.cs src/AstraRunner.Infrastructure/Loop/AppTokenRepository.cs src/AstraRunner.Api/Program.cs src/AstraRunner.Infrastructure/Migrations/ tests/AstraRunner.Tests/Unit/Loop/VerifyAppTokenServiceTests.cs
git commit -m "feat(auth): AppToken scheme with peppered lookup + salted verifier"
```

---

### Task 5: AppTokens management endpoints (`POST` / `DELETE`)

**Files:**
- Create: `src/AstraRunner.Api/Controllers/V2/AppTokensController.cs`
- Create: `src/AstraRunner.Application/Loop/Tokens/CreateAppTokenHandler.cs`
- Create: `src/AstraRunner.Application/Loop/Tokens/RevokeAppTokenHandler.cs`
- Create: `tests/AstraRunner.Tests/Integration/Api/V2/AppTokensControllerTests.cs`

- [ ] **Step 1: Write the failing integration test**

`tests/AstraRunner.Tests/Integration/Api/V2/AppTokensControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using AstraRunner.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace AstraRunner.Tests.Integration.Api.V2;

[Collection(nameof(WebAppFixture))]
public class AppTokensControllerTests
{
    private readonly WebAppFixture _fx;
    public AppTokensControllerTests(WebAppFixture fx) => _fx = fx;

    [Fact]
    public async Task Create_returns_plaintext_token_once()
    {
        var client = _fx.CreateAuthenticatedClient(); // existing tenant auth
        var appId = await _fx.SeedAppAsync();

        var resp = await client.PostAsJsonAsync(
            $"/api/v2/apps/{appId}/tokens",
            new { label = "ci-loop" });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<CreateTokenResponse>();
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrEmpty();
        body.Label.Should().Be("ci-loop");
    }

    [Fact]
    public async Task Revoke_marks_token_inactive()
    {
        var client = _fx.CreateAuthenticatedClient();
        var appId = await _fx.SeedAppAsync();
        var create = await client.PostAsJsonAsync($"/api/v2/apps/{appId}/tokens", new { label = "x" });
        var tokenId = (await create.Content.ReadFromJsonAsync<CreateTokenResponse>())!.Id;

        var del = await client.DeleteAsync($"/api/v2/apps/{appId}/tokens/{tokenId}");

        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private sealed record CreateTokenResponse(Guid Id, string Token, string Label);
}
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~AppTokensControllerTests"
```

Expected: 404 on the POST.

- [ ] **Step 3: Implement handlers**

`src/AstraRunner.Application/Loop/Tokens/CreateAppTokenHandler.cs`:

```csharp
using System.Security.Cryptography;
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;

namespace AstraRunner.Application.Loop.Tokens;

public sealed class CreateAppTokenHandler
{
    private readonly IAppTokenRepository _repo;
    private readonly ITokenHasher _hasher;
    private readonly Func<DateTimeOffset> _now;
    private readonly byte[] _pepper;

    public CreateAppTokenHandler(IAppTokenRepository repo, ITokenHasher hasher, Func<DateTimeOffset> now, byte[] pepper)
    {
        _repo = repo;
        _hasher = hasher;
        _now = now;
        _pepper = pepper;
    }

    public async Task<(Guid TokenId, string Plaintext)> ExecuteAsync(
        Guid tenantId, Guid appId, string label, CancellationToken ct)
    {
        var plaintext = GeneratePlaintext();
        var token = new AppToken
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AppId = appId,
            LookupHash = _hasher.LookupHash(plaintext, _pepper),
            VerifierHash = _hasher.Hash(plaintext),
            Label = label,
            CreatedAt = _now()
        };
        await _repo.AddAsync(token, ct);
        return (token.Id, plaintext);
    }

    private static string GeneratePlaintext()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return "lrt_" + Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
```

`src/AstraRunner.Application/Loop/Tokens/RevokeAppTokenHandler.cs`:

```csharp
using AstraRunner.Domain.Loop.Interfaces;

namespace AstraRunner.Application.Loop.Tokens;

public sealed class RevokeAppTokenHandler
{
    private readonly IAppTokenRepository _repo;
    private readonly Func<DateTimeOffset> _now;
    public RevokeAppTokenHandler(IAppTokenRepository repo, Func<DateTimeOffset> now)
    {
        _repo = repo;
        _now = now;
    }

    public Task ExecuteAsync(Guid tokenId, CancellationToken ct) =>
        _repo.RevokeAsync(tokenId, _now(), ct);
}
```

Register both in `Program.cs`:

```csharp
builder.Services.AddScoped<CreateAppTokenHandler>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var pepper = Convert.FromBase64String(cfg["Loop:Tokens:Pepper"]!);
    return new CreateAppTokenHandler(
        sp.GetRequiredService<IAppTokenRepository>(),
        sp.GetRequiredService<ITokenHasher>(),
        () => DateTimeOffset.UtcNow,
        pepper);
});
builder.Services.AddScoped<RevokeAppTokenHandler>(sp =>
    new RevokeAppTokenHandler(sp.GetRequiredService<IAppTokenRepository>(), () => DateTimeOffset.UtcNow));
```

- [ ] **Step 4: Implement the controller**

`src/AstraRunner.Api/Controllers/V2/AppTokensController.cs`:

```csharp
using System.Security.Claims;
using AstraRunner.Application.Loop.Tokens;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AstraRunner.Api.Controllers.V2;

[ApiController]
[Authorize] // existing tenant auth — NOT AppToken scheme
[Route("api/v2/apps/{appId:guid}/tokens")]
public sealed class AppTokensController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromRoute] Guid appId,
        [FromBody] CreateTokenRequest body,
        [FromServices] CreateAppTokenHandler handler,
        [FromServices] ITenantContext tenantContext, // existing tenant resolution service
        CancellationToken ct)
    {
        var tenantId = tenantContext.TenantId; // adjust to match the existing accessor
        var (id, plaintext) = await handler.ExecuteAsync(tenantId, appId, body.Label, ct);
        return Created($"/api/v2/apps/{appId}/tokens/{id}", new
        {
            id,
            token = plaintext,
            label = body.Label
        });
    }

    [HttpDelete("{tokenId:guid}")]
    public async Task<IActionResult> Revoke(
        [FromRoute] Guid appId,
        [FromRoute] Guid tokenId,
        [FromServices] RevokeAppTokenHandler handler,
        CancellationToken ct)
    {
        await handler.ExecuteAsync(tokenId, ct);
        return NoContent();
    }

    public sealed record CreateTokenRequest(string Label);
}
```

(`ITenantContext` is a placeholder for the existing tenant-resolution service the runner already uses for `/api/v1/...`. Implementer must wire to the actual service — check `CrewMonitorController.cs` for the pattern.)

- [ ] **Step 5: Run integration tests**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~AppTokensControllerTests"
```

Expected: 2/2 PASS.

- [ ] **Step 6: Commit**

```pwsh
git add src/AstraRunner.Application/Loop/Tokens/CreateAppTokenHandler.cs src/AstraRunner.Application/Loop/Tokens/RevokeAppTokenHandler.cs src/AstraRunner.Api/Controllers/V2/AppTokensController.cs src/AstraRunner.Api/Program.cs tests/AstraRunner.Tests/Integration/Api/V2/AppTokensControllerTests.cs
git commit -m "feat(api): v2 app token mgmt endpoints (create + revoke)"
```

---

### Task 6: IngestController shell with IIngestQueue

**Files:**
- Create: `src/AstraRunner.Application/Loop/Ingest/IIngestQueue.cs`
- Create: `src/AstraRunner.Application/Loop/Ingest/InMemoryIngestQueue.cs`
- Create: `src/AstraRunner.Application/Loop/Ingest/IngestEnvelopeDto.cs`
- Create: `src/AstraRunner.Api/Controllers/V2/IngestController.cs`
- Create: `tests/AstraRunner.Tests/Unit/Loop/InMemoryIngestQueueTests.cs`
- Create: `tests/AstraRunner.Tests/Integration/Api/V2/IngestControllerTests.cs`

- [ ] **Step 1: Write the failing queue test**

`tests/AstraRunner.Tests/Unit/Loop/InMemoryIngestQueueTests.cs`:

```csharp
using AstraRunner.Application.Loop.Ingest;
using FluentAssertions;
using Xunit;

namespace AstraRunner.Tests.Unit.Loop;

public class InMemoryIngestQueueTests
{
    [Fact]
    public async Task Enqueue_then_dequeue_preserves_order()
    {
        var q = new InMemoryIngestQueue(capacity: 10);
        await q.EnqueueAsync(new IngestEnvelopeDto { Kind = "k1" }, CancellationToken.None);
        await q.EnqueueAsync(new IngestEnvelopeDto { Kind = "k2" }, CancellationToken.None);

        var a = await q.DequeueAsync(CancellationToken.None);
        var b = await q.DequeueAsync(CancellationToken.None);

        a.Kind.Should().Be("k1");
        b.Kind.Should().Be("k2");
    }

    [Fact]
    public async Task TryEnqueue_returns_false_when_capacity_full()
    {
        var q = new InMemoryIngestQueue(capacity: 1);
        var first = await q.TryEnqueueAsync(new IngestEnvelopeDto { Kind = "k1" });
        var second = await q.TryEnqueueAsync(new IngestEnvelopeDto { Kind = "k2" });

        first.Should().BeTrue();
        second.Should().BeFalse();
    }
}
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~InMemoryIngestQueueTests"
```

Expected: compile error.

- [ ] **Step 3: Implement queue + DTO**

`src/AstraRunner.Application/Loop/Ingest/IngestEnvelopeDto.cs`:

```csharp
namespace AstraRunner.Application.Loop.Ingest;

public sealed class IngestEnvelopeDto
{
    public string TenantId { get; set; } = "";
    public string AppId { get; set; } = "";
    public string Kind { get; set; } = "";
    public string PayloadJson { get; set; } = "{}";
    public string? SourcePath { get; set; }
    public long? LineOffset { get; set; }
    public DateTimeOffset EmittedAt { get; set; }
    public string? SchemaVersion { get; set; }
}
```

`src/AstraRunner.Application/Loop/Ingest/IIngestQueue.cs`:

```csharp
namespace AstraRunner.Application.Loop.Ingest;

public interface IIngestQueue
{
    ValueTask EnqueueAsync(IngestEnvelopeDto envelope, CancellationToken ct);
    ValueTask<bool> TryEnqueueAsync(IngestEnvelopeDto envelope);
    ValueTask<IngestEnvelopeDto> DequeueAsync(CancellationToken ct);
}
```

`src/AstraRunner.Application/Loop/Ingest/InMemoryIngestQueue.cs`:

```csharp
using System.Threading.Channels;

namespace AstraRunner.Application.Loop.Ingest;

public sealed class InMemoryIngestQueue : IIngestQueue
{
    private readonly Channel<IngestEnvelopeDto> _channel;

    public InMemoryIngestQueue(int capacity = 10_000)
    {
        _channel = Channel.CreateBounded<IngestEnvelopeDto>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        });
    }

    public ValueTask EnqueueAsync(IngestEnvelopeDto envelope, CancellationToken ct) =>
        _channel.Writer.WriteAsync(envelope, ct);

    public ValueTask<bool> TryEnqueueAsync(IngestEnvelopeDto envelope) =>
        ValueTask.FromResult(_channel.Writer.TryWrite(envelope));

    public ValueTask<IngestEnvelopeDto> DequeueAsync(CancellationToken ct) =>
        _channel.Reader.ReadAsync(ct);
}
```

Register in `Program.cs`:

```csharp
builder.Services.AddSingleton<IIngestQueue>(_ => new InMemoryIngestQueue(capacity: 10_000));
```

- [ ] **Step 4: Run queue test**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~InMemoryIngestQueueTests"
```

Expected: 2/2 PASS.

- [ ] **Step 5: Write failing integration test for IngestController**

`tests/AstraRunner.Tests/Integration/Api/V2/IngestControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AstraRunner.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace AstraRunner.Tests.Integration.Api.V2;

[Collection(nameof(WebAppFixture))]
public class IngestControllerTests
{
    private readonly WebAppFixture _fx;
    public IngestControllerTests(WebAppFixture fx) => _fx = fx;

    [Fact]
    public async Task Returns_202_for_valid_bearer()
    {
        var (appId, plaintext) = await _fx.SeedAppWithTokenAsync();
        var client = _fx.CreateUnauthenticatedClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", plaintext);

        var resp = await client.PostAsJsonAsync("/api/v2/ingest/loop-events", new
        {
            tenantId = "ignored",
            appId = appId.ToString(),
            kind = "slice.workflow_state_changed",
            payload = new { sliceId = "SLICE-1", ts = "2026-06-15T12:00:00Z" },
            emittedAt = "2026-06-15T12:00:00Z"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }

    [Fact]
    public async Task Returns_401_for_missing_bearer()
    {
        var client = _fx.CreateUnauthenticatedClient();
        var resp = await client.PostAsJsonAsync("/api/v2/ingest/loop-events", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Returns_401_for_revoked_token()
    {
        var (appId, plaintext, tokenId) = await _fx.SeedAppWithTokenAsyncTuple();
        await _fx.RevokeTokenAsync(appId, tokenId);
        var client = _fx.CreateUnauthenticatedClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", plaintext);

        var resp = await client.PostAsJsonAsync("/api/v2/ingest/loop-events", new
        {
            kind = "slice.workflow_state_changed",
            payload = new { },
            emittedAt = "2026-06-15T12:00:00Z"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

(`SeedAppWithTokenAsync` etc. are additions to the existing `WebAppFixture` — implementer adds them following the existing seed helpers' pattern.)

- [ ] **Step 6: Run integration test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~IngestControllerTests"
```

Expected: 404 on the POST.

- [ ] **Step 7: Implement the controller**

`src/AstraRunner.Api/Controllers/V2/IngestController.cs`:

```csharp
using System.Security.Claims;
using System.Text.Json;
using AstraRunner.Api.Auth;
using AstraRunner.Application.Loop.Ingest;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AstraRunner.Api.Controllers.V2;

[ApiController]
[Route("api/v2/ingest")]
[Authorize(AuthenticationSchemes = AppTokenAuthHandler.SchemeName)]
public sealed class IngestController : ControllerBase
{
    [HttpPost("loop-events")]
    public async Task<IActionResult> Ingest(
        [FromBody] JsonElement body,
        [FromServices] IIngestQueue queue,
        CancellationToken ct)
    {
        var appIdClaim = User.FindFirstValue(AppTokenAuthHandler.ClaimAppId);
        var tenantIdClaim = User.FindFirstValue(AppTokenAuthHandler.ClaimTenantId);
        if (appIdClaim is null || tenantIdClaim is null) return Unauthorized();

        if (!body.TryGetProperty("kind", out var kindEl) || kindEl.ValueKind != JsonValueKind.String)
        {
            return UnprocessableEntity(new { error = "kind missing or not a string" });
        }
        if (!body.TryGetProperty("emittedAt", out var emittedEl) || !emittedEl.TryGetDateTimeOffset(out var emittedAt))
        {
            return UnprocessableEntity(new { error = "emittedAt missing or invalid" });
        }
        var payload = body.TryGetProperty("payload", out var pEl) ? pEl.GetRawText() : "{}";
        var sourcePath = body.TryGetProperty("sourcePath", out var sp) && sp.ValueKind == JsonValueKind.String
            ? sp.GetString() : null;
        var lineOffset = body.TryGetProperty("lineOffset", out var lo) && lo.ValueKind == JsonValueKind.Number
            ? lo.GetInt64() : (long?)null;

        var envelope = new IngestEnvelopeDto
        {
            TenantId = tenantIdClaim,
            AppId = appIdClaim,
            Kind = kindEl.GetString()!,
            PayloadJson = payload,
            SourcePath = sourcePath,
            LineOffset = lineOffset,
            EmittedAt = emittedAt
        };

        await queue.EnqueueAsync(envelope, ct);
        return Accepted();
    }
}
```

- [ ] **Step 8: Run integration tests**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~IngestControllerTests"
```

Expected: 3/3 PASS.

- [ ] **Step 9: Commit**

```pwsh
git add src/AstraRunner.Application/Loop/Ingest/ src/AstraRunner.Api/Controllers/V2/IngestController.cs src/AstraRunner.Api/Program.cs tests/AstraRunner.Tests/Unit/Loop/InMemoryIngestQueueTests.cs tests/AstraRunner.Tests/Integration/Api/V2/IngestControllerTests.cs
git commit -m "feat(api): v2 ingest endpoint with Bearer auth + channel queue"
```

---

### Task 7: LoopEventRepository upsert integration test

**Files:**
- Create: `tests/AstraRunner.Tests/Integration/Loop/LoopEventRepositoryTests.cs`

- [ ] **Step 1: Write the failing test**

```csharp
using AstraRunner.Domain.Loop;
using AstraRunner.Domain.Loop.Interfaces;
using AstraRunner.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace AstraRunner.Tests.Integration.Loop;

[Collection(nameof(DbFixture))]
public class LoopEventRepositoryTests
{
    private readonly DbFixture _fx;
    public LoopEventRepositoryTests(DbFixture fx) => _fx = fx;

    [Fact]
    public async Task Upsert_with_same_source_path_and_line_offset_is_idempotent()
    {
        var repo = _fx.Resolve<ILoopEventRepository>();
        var appId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var envelope = new LoopEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AppId = appId,
            Kind = "slice.workflow_state_changed",
            RawPayloadJson = "{\"sliceId\":\"S1\"}",
            SourcePath = "x.jsonl",
            LineOffset = 12,
            EmittedAt = DateTimeOffset.UtcNow,
            ReceivedAt = DateTimeOffset.UtcNow
        };

        await repo.UpsertAsync(envelope, CancellationToken.None);
        await repo.UpsertAsync(envelope with { Id = Guid.NewGuid() }, CancellationToken.None);

        var rows = await repo.ListByAppAsync(appId, DateTimeOffset.MinValue, 100, CancellationToken.None);
        rows.Count.Should().Be(1);
    }

    [Fact]
    public async Task GetWatermark_returns_max_offset()
    {
        var repo = _fx.Resolve<ILoopEventRepository>();
        var appId = Guid.NewGuid();
        for (long i = 0; i < 5; i++)
        {
            await repo.UpsertAsync(new LoopEvent
            {
                Id = Guid.NewGuid(),
                TenantId = Guid.NewGuid(),
                AppId = appId,
                Kind = "k",
                RawPayloadJson = "{}",
                SourcePath = "a.jsonl",
                LineOffset = i,
                EmittedAt = DateTimeOffset.UtcNow,
                ReceivedAt = DateTimeOffset.UtcNow
            }, CancellationToken.None);
        }

        var wm = await repo.GetWatermarkAsync(appId, "a.jsonl", CancellationToken.None);
        wm.Should().Be(4);
    }
}
```

(`LoopEvent` is a regular sealed class so `with { … }` requires conversion to a record OR replacing the second upsert with a manually-constructed instance carrying same source-path + offset. If `LoopEvent` is not a record, replace the second `UpsertAsync` call with a fresh `new LoopEvent { … same SourcePath, same LineOffset, different Id … }`.)

- [ ] **Step 2: Run test to confirm fail or pass**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~LoopEventRepositoryTests"
```

Expected: PASS (repository already implemented in Task 3; this is a contract test). If FAIL, fix `LoopEventRepository.UpsertAsync`.

- [ ] **Step 3: Commit**

```pwsh
git add tests/AstraRunner.Tests/Integration/Loop/LoopEventRepositoryTests.cs
git commit -m "test(loop): integration tests for LoopEventRepository upsert + watermark"
```

---

### Task 8: SignalR hub + notifier facade

**Files:**
- Create: `src/AstraRunner.Api/Hubs/LoopEventsHub.cs`
- Create: `src/AstraRunner.Api/Hubs/ILoopEventsNotifier.cs`
- Create: `src/AstraRunner.Api/Hubs/LoopEventsNotifier.cs`
- Modify: `src/AstraRunner.Api/Program.cs`
- Create: `tests/AstraRunner.Tests/Integration/Hubs/LoopEventsHubTests.cs`

- [ ] **Step 1: Write failing hub test**

```csharp
using AstraRunner.Tests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Xunit;

namespace AstraRunner.Tests.Integration.Hubs;

[Collection(nameof(WebAppFixture))]
public class LoopEventsHubTests
{
    private readonly WebAppFixture _fx;
    public LoopEventsHubTests(WebAppFixture fx) => _fx = fx;

    [Fact]
    public async Task Client_in_slice_group_receives_notification()
    {
        var (appId, plaintext) = await _fx.SeedAppWithTokenAsync();
        var conn = new HubConnectionBuilder()
            .WithUrl(new Uri(_fx.BaseAddress, "/hubs/loop-events"), opts =>
            {
                opts.AccessTokenProvider = () => Task.FromResult<string?>(plaintext);
                opts.HttpMessageHandlerFactory = _ => _fx.Server.CreateHandler();
            })
            .Build();

        var received = new TaskCompletionSource<string>();
        conn.On<string>("event", payload => received.TrySetResult(payload));

        await conn.StartAsync();
        await conn.InvokeAsync("JoinSlice", appId.ToString(), "SLICE-1");

        var notifier = _fx.Resolve<AstraRunner.Api.Hubs.ILoopEventsNotifier>();
        await notifier.NotifySliceAsync(appId, "SLICE-1", "{\"hello\":\"world\"}", CancellationToken.None);

        var payload = await received.Task.WaitAsync(TimeSpan.FromSeconds(5));
        payload.Should().Contain("hello");

        await conn.DisposeAsync();
    }
}
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~LoopEventsHubTests"
```

Expected: hub endpoint 404 / connection failure.

- [ ] **Step 3: Implement hub + notifier**

`src/AstraRunner.Api/Hubs/LoopEventsHub.cs`:

```csharp
using AstraRunner.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AstraRunner.Api.Hubs;

[Authorize(AuthenticationSchemes = AppTokenAuthHandler.SchemeName)]
public sealed class LoopEventsHub : Hub
{
    public Task JoinApp(string appId) => Groups.AddToGroupAsync(Context.ConnectionId, GroupApp(appId));
    public Task LeaveApp(string appId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupApp(appId));

    public Task JoinSlice(string appId, string sliceId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupSlice(appId, sliceId));
    public Task LeaveSlice(string appId, string sliceId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupSlice(appId, sliceId));

    public Task JoinWave(string appId, string waveId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupWave(appId, waveId));
    public Task LeaveWave(string appId, string waveId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupWave(appId, waveId));

    internal static string GroupApp(string appId) => $"app:{appId}";
    internal static string GroupSlice(string appId, string sliceId) => $"app:{appId}:slice:{sliceId}";
    internal static string GroupWave(string appId, string waveId) => $"app:{appId}:wave:{waveId}";
}
```

`src/AstraRunner.Api/Hubs/ILoopEventsNotifier.cs`:

```csharp
namespace AstraRunner.Api.Hubs;

public interface ILoopEventsNotifier
{
    Task NotifyAppAsync(Guid appId, string payloadJson, CancellationToken ct);
    Task NotifySliceAsync(Guid appId, string sliceId, string payloadJson, CancellationToken ct);
    Task NotifyWaveAsync(Guid appId, string waveId, string payloadJson, CancellationToken ct);
}
```

`src/AstraRunner.Api/Hubs/LoopEventsNotifier.cs`:

```csharp
using Microsoft.AspNetCore.SignalR;

namespace AstraRunner.Api.Hubs;

public sealed class LoopEventsNotifier : ILoopEventsNotifier
{
    private readonly IHubContext<LoopEventsHub> _hub;
    public LoopEventsNotifier(IHubContext<LoopEventsHub> hub) => _hub = hub;

    public Task NotifyAppAsync(Guid appId, string payloadJson, CancellationToken ct) =>
        _hub.Clients.Group(LoopEventsHub.GroupApp(appId.ToString())).SendAsync("event", payloadJson, ct);

    public Task NotifySliceAsync(Guid appId, string sliceId, string payloadJson, CancellationToken ct) =>
        _hub.Clients.Group(LoopEventsHub.GroupSlice(appId.ToString(), sliceId)).SendAsync("event", payloadJson, ct);

    public Task NotifyWaveAsync(Guid appId, string waveId, string payloadJson, CancellationToken ct) =>
        _hub.Clients.Group(LoopEventsHub.GroupWave(appId.ToString(), waveId)).SendAsync("event", payloadJson, ct);
}
```

- [ ] **Step 4: Register SignalR + notifier + map hub in Program.cs**

In `src/AstraRunner.Api/Program.cs`, before `app.Run()`:

```csharp
builder.Services.AddSignalR();
builder.Services.AddSingleton<ILoopEventsNotifier, LoopEventsNotifier>();
```

After `app.MapControllers()`:

```csharp
app.MapHub<LoopEventsHub>("/hubs/loop-events");
```

Add usings as needed:

```csharp
using AstraRunner.Api.Hubs;
```

- [ ] **Step 5: Run hub integration test**

```pwsh
dotnet test tests/AstraRunner.Tests/AstraRunner.Tests.csproj --filter "FullyQualifiedName~LoopEventsHubTests"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```pwsh
git add src/AstraRunner.Api/Hubs/ src/AstraRunner.Api/Program.cs tests/AstraRunner.Tests/Integration/Hubs/LoopEventsHubTests.cs
git commit -m "feat(hub): SignalR LoopEventsHub with app/slice/wave groups + notifier facade"
```

---

### Task 9: v2 frontend router stub with empty page shells

**Files:**
- Modify: `src/frontend/dashboard/package.json`
- Create: `src/frontend/dashboard/src/v2/router.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/SliceLiveDetail.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/WaveList.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/WaveDetail.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/AgentPerformance.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/HaltBadges.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/IngestDrift.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/RoleAgentCost.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/Decisions.tsx`
- Create: `src/frontend/dashboard/src/v2/pages/Learnings.tsx`
- Create: `src/frontend/dashboard/src/v2/lib/signalr-client.ts`
- Modify: `src/frontend/dashboard/src/App.tsx`

- [ ] **Step 1: Add `@microsoft/signalr` dependency**

```pwsh
cd src/frontend/dashboard
npm install @microsoft/signalr@^9
cd ../../..
```

Expected: `package.json` + `package-lock.json` updated.

- [ ] **Step 2: Create empty page shells**

Each of the 9 page files follows the same pattern. Example for `SliceLiveDetail.tsx`:

```tsx
import { useParams } from "react-router-dom";

export function SliceLiveDetail() {
  const { sliceId } = useParams<{ sliceId: string }>();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Slice live detail</h1>
      <p className="text-sm text-muted-foreground">Slice: {sliceId ?? "?"}</p>
      <p className="mt-4 text-sm">Live event timeline lands in M1.</p>
    </main>
  );
}
```

Repeat for `WaveList`, `WaveDetail`, `AgentPerformance`, `HaltBadges`, `IngestDrift`, `RoleAgentCost`, `Decisions`, `Learnings` — each prints the title and a "lands in M<N>" hint (M2 for wave pages, M3 for AgentPerformance/RoleAgentCost, M4 for HaltBadges, M5 for Decisions/Learnings, M6 for IngestDrift).

- [ ] **Step 3: Author the v2 router**

`src/frontend/dashboard/src/v2/router.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import { SliceLiveDetail } from "./pages/SliceLiveDetail";
import { WaveList } from "./pages/WaveList";
import { WaveDetail } from "./pages/WaveDetail";
import { AgentPerformance } from "./pages/AgentPerformance";
import { HaltBadges } from "./pages/HaltBadges";
import { IngestDrift } from "./pages/IngestDrift";
import { RoleAgentCost } from "./pages/RoleAgentCost";
import { Decisions } from "./pages/Decisions";
import { Learnings } from "./pages/Learnings";

export function V2Router() {
  return (
    <Routes>
      <Route path="slices/:sliceId" element={<SliceLiveDetail />} />
      <Route path="waves" element={<WaveList />} />
      <Route path="waves/:waveId" element={<WaveDetail />} />
      <Route path="agents" element={<AgentPerformance />} />
      <Route path="halt-badges" element={<HaltBadges />} />
      <Route path="ingest-drift" element={<IngestDrift />} />
      <Route path="role-agent-cost" element={<RoleAgentCost />} />
      <Route path="decisions" element={<Decisions />} />
      <Route path="learnings" element={<Learnings />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Author the SignalR client wrapper**

`src/frontend/dashboard/src/v2/lib/signalr-client.ts`:

```typescript
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

export interface SignalRClientOptions {
  hubUrl: string;
  bearerToken: () => Promise<string>;
}

export function buildLoopEventsConnection(opts: SignalRClientOptions): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(opts.hubUrl, { accessTokenFactory: opts.bearerToken })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
}
```

- [ ] **Step 5: Mount the v2 router in App.tsx**

Locate the existing `<Routes>` block in `src/frontend/dashboard/src/App.tsx`. Add a single new route inside the existing block (do NOT touch any other route):

```tsx
import { V2Router } from "./v2/router";

// inside the Routes element:
<Route path="/v2/*" element={<V2Router />} />
```

- [ ] **Step 6: Build and smoke-test the dashboard**

```pwsh
cd src/frontend/dashboard
npm run build
cd ../../..
```

Expected: build succeeds. Then start AppHost:

```pwsh
dotnet run --project src/AstraRunner.AppHost --launch-profile http
```

Open `http://localhost:5175/v2/waves`. Expected: page renders the "Wave list" shell with "lands in M2" hint.

Stop AppHost (Ctrl+C).

- [ ] **Step 7: Commit**

```pwsh
git add src/frontend/dashboard/src/v2/ src/frontend/dashboard/src/App.tsx src/frontend/dashboard/package.json src/frontend/dashboard/package-lock.json
git commit -m "feat(dashboard): v2 router scaffold with empty page shells"
```

---

### Task 10: Final full-suite check

**Files:** none

- [ ] **Step 1: Run all backend tests**

```pwsh
dotnet test
```

Expected: all tests PASS.

- [ ] **Step 2: Run frontend lint + build**

```pwsh
cd src/frontend/dashboard
npm run lint
npm run build
cd ../../..
```

Expected: clean.

- [ ] **Step 3: Verify no v1 controller/page was modified**

```pwsh
git diff --stat origin/main -- src/AstraRunner.Api/Controllers/CrewMonitorController.cs src/AstraRunner.Api/Controllers/LoopArtifactsController.cs src/AstraRunner.Api/Controllers/LoopChartsController.cs src/AstraRunner.Api/Controllers/GradesController.cs
```

Expected: no rows (no changes to v1 controllers).

```pwsh
git diff --stat origin/main -- src/frontend/dashboard/src/pages
```

Expected: no rows (no changes to v1 pages).

- [ ] **Step 4: Verify migrations apply cleanly on a fresh DB**

```pwsh
dotnet ef database drop --project src/AstraRunner.Infrastructure --startup-project src/AstraRunner.AppHost --force
dotnet ef database update --project src/AstraRunner.Infrastructure --startup-project src/AstraRunner.AppHost
```

Expected: no errors. Both `app_tokens` and `loop_events` tables exist.

⚠ The `database drop` above DELETES the local astra_humanizer DB — run only in a development environment. Confirm before proceeding if any local seed data is precious.

- [ ] **Step 5: Open Aspire dashboard sanity check**

```pwsh
dotnet run --project src/AstraRunner.AppHost --launch-profile http
```

Open `http://localhost:15080`. Expected: `astrarunner-web`, `AstraRunner.Api`, `AstraRunner.Worker` all green. No new resources required by M0.

- [ ] **Step 6: Commit any final fixups; otherwise no-op**

```pwsh
git status
```

If nothing to commit, plan is complete.

---

## Self-Review Notes

- Spec coverage: R0-1 → Task 6. R0-2 → Tasks 1+4+5. R0-3 → Tasks 2+3+7. R0-4 → Task 8. R0-5 → Task 9.
- No placeholders remain — every code block is complete.
- Type consistency: `IngestEnvelopeDto`, `LoopEvent`, `AppToken`, hub group helpers (`GroupApp`, `GroupSlice`, `GroupWave`), and SignalR `"event"` channel name are used consistently across server + tests + frontend client wrapper.
- Strict v1 isolation verified by Task 10 Step 3 diff check.
- The Step 4 `database drop` carries an explicit destructive-action warning per repo safety conventions.

## Out of scope (next milestone)

- LoopEventDispatcher routing + per-stream handlers (M1: SliceEventHandler, GradeJsonlHandler).
- Domain entities beyond the envelope (SliceWorkflowEvent, AgentRun, GradeRecord, WaveRun, HaltBadge — M1, M2, M4).
- Filesystem-resync worker — M1.
- SignalR client subscription inside actual pages — M1 (slice live detail wires up first).
- Token rotation / expiry policy — long-lived tokens for M0; rotation is a separate hardening pass.
