<?php

namespace Tests\Feature;

use App\Models\ProjectUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectUserControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The route is registered as GET (routes/api.php), and gui/'s
     * get_start.js calls it as a GET with name/email query params against
     * a hardcoded production URL — so these tests exercise the endpoint
     * as GET to match the real client, not as a hypothetical POST.
     */
    public function test_creates_a_project_user_with_valid_query_params(): void
    {
        $response = $this->getJson('/api/get-started?name=Jane+Doe&email=jane@example.com');

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'User created successfully',
            ])
            ->assertJsonStructure([
                'data' => ['id', 'name', 'email', 'created_at'],
            ]);

        $this->assertDatabaseHas('project_users', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
        ]);
    }

    public function test_requires_name(): void
    {
        $response = $this->getJson('/api/get-started?email=jane@example.com');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_requires_email(): void
    {
        $response = $this->getJson('/api/get-started?name=Jane+Doe');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_rejects_malformed_email(): void
    {
        $response = $this->getJson('/api/get-started?name=Jane+Doe&email=not-an-email');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Documents existing behavior rather than asserting it's desirable:
     * there's no unique constraint on email (migration + controller both
     * skip it "as requested"), and the endpoint is a GET, so anything that
     * prefetches or re-requests this URL (browser link prefetch, crawler,
     * retry logic) creates a duplicate row rather than erroring. Flagged
     * separately as a design risk — not changed here since gui/ depends on
     * the current GET contract.
     */
    public function test_allows_duplicate_emails_without_error(): void
    {
        $this->getJson('/api/get-started?name=Jane+Doe&email=jane@example.com')
            ->assertStatus(201);
        $this->getJson('/api/get-started?name=Jane+Doe&email=jane@example.com')
            ->assertStatus(201);

        $this->assertSame(2, ProjectUser::where('email', 'jane@example.com')->count());
    }
}
