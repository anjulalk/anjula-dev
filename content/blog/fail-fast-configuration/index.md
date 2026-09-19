+++
title = "Fail fast on missing configuration"
slug = "fail-fast-configuration"
date = 2026-07-15T12:00:00+05:30
description = "GetValue returns a silent default when a configuration key is missing. Here are two small extensions that throw at startup instead, and how to test them with the real binder."
summary = "Make a missing configuration key throw at startup instead of returning a silent default."
images = ["images/fail-fast-configuration.png"]
tags = ["csharp", "dotnet", "testing"]
draft = false
+++

Every project has a configuration key that only exists in production. Ours was a cache TTL. The code asked for `Cache:TtlSeconds`; the JSON file said `Cache:TTLSeconds`. `GetValue<int>` returned `0`, nothing threw, and every cache entry expired the moment it was written. The database absorbed the traffic and it took an afternoon to trace the storm of queries back to one missing letter.

That leniency is deliberate. When a key is missing and no default is supplied, `GetValue<T>()` returns `default(T)`, which is `0`, `false` or `null`. `GetConnectionString()` is the same story and returns `null`. The failure then shows up wherever that value gets used, which is rarely near the configuration.

The framework already accepts the argument for strictness. .NET 6 added `GetRequiredSection()`, which throws when a section is absent, but there is still nothing for a single value. The proposal has been [open for years](https://github.com/dotnet/runtime/issues/69163). These are the ten lines that fill the gap.

## Two extensions

```csharp
using Microsoft.Extensions.Configuration;

namespace MyApp.Configuration;

public static class ConfigurationExtensions
{
    public static T GetRequiredValue<T>(this IConfiguration configuration, string key)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        if (!configuration.GetSection(key).Exists())
        {
            throw new InvalidOperationException(
                $"Required configuration value '{key}' was not found.");
        }

        var value = configuration.GetValue<T>(key);
        if (value is null || value is string s && string.IsNullOrWhiteSpace(s))
        {
            throw new InvalidOperationException(
                $"Required configuration value '{key}' is empty.");
        }

        return value;
    }

    public static string GetRequiredConnectionString(this IConfiguration configuration, string name)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        var connectionString = configuration.GetConnectionString(name);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Required connection string '{name}' was not found. " +
                $"Add it under 'ConnectionStrings:{name}'.");
        }

        return connectionString;
    }
}
```

The checks are doing three separate jobs.

Checking `Exists()` before binding is what catches a missing `int`. Without it, `GetValue<int>` is happy to convert nothing into `0`, which is the bug we are trying to kill. An empty string is treated as a failure too, because `"ApiKey": ""` is a misconfiguration rather than a value. And the exception names the key, which is what turns a midnight mystery into a one line fix. Values that exist but cannot be parsed still throw from the binder, which is also fine.

The whole method is one decision chain with no quiet exits:

{{< mermaid >}}
flowchart TD
    A["GetRequiredValue(key)"] --> B{"Section exists?"}
    B -->|"No"| C["Throw: key not found"]
    B -->|"Yes"| D["Bind to T"]
    D -->|"Fails"| E["Binder throws"]
    D -->|"OK"| F{"Null or blank?"}
    F -->|"Yes"| G["Throw: value is empty"]
    F -->|"No"| H["Return value"]
{{< /mermaid >}}

## Using them

Read required settings while the application is being built, so a bad deployment dies immediately with a message instead of misbehaving for hours.

```csharp
var ttl = builder.Configuration.GetRequiredValue<int>("Cache:TtlSeconds");
var db = builder.Configuration.GetRequiredConnectionString("OrdersDb");
```

On terminology, since it comes up: this is not ASP.NET Core specific. ASP.NET Core and plain .NET hosts share the same `Microsoft.Extensions.Configuration` stack, so the extensions work in a console app, a worker service or a test host.

## Testing without mocks

Extension methods are static, so Moq and NSubstitute cannot intercept them, and trying to mock `IConfiguration` would only verify the mock. Run the real binder over a real, in-memory configuration instead. `ConfigurationBuilder.AddInMemoryCollection()` gives you an `IConfigurationRoot` backed by a dictionary, and it behaves like production for nested keys, type conversion and `ConnectionStrings` lookup.

```csharp
using Microsoft.Extensions.Configuration;
using MyApp.Configuration;

public sealed class ConfigurationExtensionsTests
{
    private static IConfiguration BuildConfig(IDictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void GetRequiredValue_Returns_Configured_Values()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Api:BaseUrl"] = "https://api.example.com",
            ["Cache:TtlSeconds"] = "60",
            ["Cache:Enabled"] = "true",
        });

        Assert.Equal("https://api.example.com", config.GetRequiredValue<string>("Api:BaseUrl"));
        Assert.Equal(60, config.GetRequiredValue<int>("Cache:TtlSeconds"));
        Assert.True(config.GetRequiredValue<bool>("Cache:Enabled"));
    }

    [Fact]
    public void GetRequiredValue_Throws_With_Key_Name_When_Missing()
    {
        var config = BuildConfig(new Dictionary<string, string?>());

        var ex = Assert.Throws<InvalidOperationException>(
            () => config.GetRequiredValue<int>("Cache:TtlSeconds"));
        Assert.Contains("Cache:TtlSeconds", ex.Message);
    }

    [Fact]
    public void GetRequiredValue_Throws_When_Value_Is_Empty()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Api:ApiKey"] = "",
        });

        Assert.Throws<InvalidOperationException>(
            () => config.GetRequiredValue<string>("Api:ApiKey"));
    }

    [Fact]
    public void GetRequiredConnectionString_Returns_Configured_Value()
    {
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["ConnectionStrings:OrdersDb"] = "Server=db;Database=orders;",
        });

        Assert.Equal(
            "Server=db;Database=orders;",
            config.GetRequiredConnectionString("OrdersDb"));
    }

    [Fact]
    public void GetRequiredConnectionString_Throws_When_Missing_Or_Empty()
    {
        var missing = BuildConfig(new Dictionary<string, string?>());
        var empty = BuildConfig(new Dictionary<string, string?>
        {
            ["ConnectionStrings:OrdersDb"] = "  ",
        });

        Assert.Throws<InvalidOperationException>(
            () => missing.GetRequiredConnectionString("OrdersDb"));
        Assert.Throws<InvalidOperationException>(
            () => empty.GetRequiredConnectionString("OrdersDb"));
    }
}
```

The test project needs `Microsoft.Extensions.Configuration`, `Microsoft.Extensions.Configuration.Binder`, `xunit`, `xunit.runner.visualstudio` and `Microsoft.NET.Test.Sdk`. One detail worth copying: the connection string test writes the key as `ConnectionStrings:OrdersDb`, which is exactly how `GetConnectionString()` resolves it, so the fake exercises the real lookup path rather than a convenient shortcut.

## What it changes

Not much code, but the failure moves. A missing setting now stops the process at startup with the key name in the message, instead of turning into a strange number somewhere deeper in the system. Required configuration is validated the same way required services are, and when the runtime eventually ships `GetRequiredValue` itself, this file can be deleted.

Links: [dotnet/runtime proposal for GetRequiredValue](https://github.com/dotnet/runtime/issues/69163)
