import {
  assertReadOnlyQuery,
  buildQuery,
  columnsFor,
  consoleUrlFor,
  evaluateFindings,
  findQuery,
  isReadOnlyQuery,
  matchQueries,
  RESOURCE_QUERY_LIBRARY,
  parseArn,
  parseConfigResults,
  summariseResults,
  taggingRowsFrom,
  worstSeverity,
} from '../resourceSearch.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runResourceSearchTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // ───────────── read-only enforcement ─────────────

  test('read-only guard rejects every mutating statement', () => {
    const mutations = [
      "DELETE FROM resources WHERE resourceId = 'x'",
      'DROP TABLE resources',
      "UPDATE resources SET x = 1",
      "INSERT INTO resources VALUES (1)",
      'TRUNCATE resources',
      "GRANT ALL ON resources TO public",
    ];
    for (const sql of mutations) {
      assert(!isReadOnlyQuery(sql), `accepted a mutating query: ${sql}`);
    }
  });

  test('read-only guard rejects statement stacking after a valid SELECT', () => {
    assert(
      !isReadOnlyQuery("SELECT resourceId WHERE resourceType = 'AWS::S3::Bucket'; DROP TABLE x"),
      'accepted a stacked statement'
    );
    // A bare trailing semicolon is ordinary SQL and must still pass.
    assert(isReadOnlyQuery('SELECT resourceId;'), 'rejected a harmless trailing semicolon');
  });

  test('read-only guard is not fooled by a keyword hidden in a comment', () => {
    // The comment is stripped, so this is a legitimate SELECT.
    assert(isReadOnlyQuery('SELECT resourceId -- DELETE everything'), 'comment stripping failed open');
    // ...but a comment must not be usable to smuggle the statement itself.
    assert(!isReadOnlyQuery('/* SELECT */ DELETE FROM resources'), 'comment let a DELETE through');
  });

  test('assertReadOnlyQuery names the reason it rejected the query', () => {
    const reasonFor = (sql) => {
      try {
        assertReadOnlyQuery(sql);
        return null;
      } catch (error) {
        return error.message;
      }
    };
    // Not a SELECT at all — the shape is the problem, so say that.
    assert(/only select/i.test(reasonFor('DELETE FROM resources') || ''), 'non-SELECT rejection did not explain itself');
    // Starts as a SELECT but smuggles a forbidden keyword — name the keyword.
    assert(/INTO/i.test(reasonFor('SELECT resourceId INTO dump') || ''), 'forbidden keyword was not named in the reason');
    assert(reasonFor("SELECT resourceId WHERE resourceType = 'AWS::S3::Bucket'") === null, 'rejected a valid query');
  });

  // ───────────── query building ─────────────

  test('buildQuery escapes quotes so a tag value cannot break out of its literal', () => {
    const sql = buildQuery(findQuery('by-tag'), { key: "it's" });
    assert(sql.includes("'it''s'"), `single quote was not escaped: ${sql}`);
    assert(isReadOnlyQuery(sql), 'escaped query no longer passes the read-only guard');
  });

  test('buildQuery refuses a missing required input instead of querying for empty string', () => {
    let threw = false;
    try {
      buildQuery(findQuery('by-tag'), {});
    } catch {
      threw = true;
    }
    assert(threw, 'built a query with an empty required tag key');
  });

  test('no library query filters on awsRegion', () => {
    // SelectResourceConfig only queries the region its client points at,
    // so a WHERE awsRegion clause can only ever return zero rows for any
    // other region — which reads as "empty" rather than "wrong region".
    for (const entry of RESOURCE_QUERY_LIBRARY) {
      assert(!/WHERE[\s\S]*awsRegion\s*=/i.test(entry.sql), `${entry.id} filters on awsRegion, which cannot work cross-region`);
    }
  });

  test('every library query is read-only and leaves no unfilled placeholder', () => {
    for (const entry of [findQuery('inventory-by-type'), findQuery('all-buckets'), findQuery('security-groups')]) {
      assert(isReadOnlyQuery(entry.sql), `library query is not read-only: ${entry.id}`);
      assert(!/\{\{/.test(entry.sql), `library query has an unfilled placeholder: ${entry.id}`);
    }
  });

  // ───────────── natural-language routing ─────────────

  test('plain questions route to the query that answers them', () => {
    const cases = [
      ['which security groups are open to the internet?', 'security-groups'],
      ['show me my s3 buckets', 'all-buckets'],
      ['what ec2 instances are running', 'running-instances'],
      ['find everything tagged Project', 'by-tag'],
    ];
    for (const [question, expected] of cases) {
      const top = matchQueries(question)[0];
      assert(top && top.entry.id === expected, `"${question}" routed to ${top?.entry.id || 'nothing'}, expected ${expected}`);
    }
  });

  test('routing is deterministic and returns nothing for an unrelated question', () => {
    const a = matchQueries('show me my s3 buckets');
    const b = matchQueries('show me my s3 buckets');
    assert(JSON.stringify(a.map((m) => m.entry.id)) === JSON.stringify(b.map((m) => m.entry.id)), 'routing is not deterministic');
    assert(matchQueries('xyzzy plugh').length === 0, 'matched an unrelated question');
  });

  // ───────────── result parsing ─────────────

  test('a malformed row is surfaced, not silently dropped', () => {
    const { rows, errors } = parseConfigResults(['{"resourceId":"a"}', 'not-json', '{"resourceId":"b"}']);
    assert(rows.length === 2, `expected 2 good rows, got ${rows.length}`);
    assert(errors.length === 1 && errors[0].index === 1, 'malformed row was not reported');
  });

  test('aggregate rows get no findings, because a count is not a resource', () => {
    // 'SELECT resourceType, COUNT(*) GROUP BY resourceType' — the first
    // query anyone runs. Judging these rows decorated every count with
    // "encryption state not returned".
    for (const type of ['AWS::S3::Bucket', 'AWS::EC2::SecurityGroup', 'AWS::EC2::Volume']) {
      const findings = evaluateFindings({ resourceType: type, 'COUNT(*)': 12 });
      assert(findings.length === 0, `aggregate row for ${type} produced findings: ${JSON.stringify(findings)}`);
    }
  });

  test('a real resource row is still judged after the aggregate guard', () => {
    // The guard keys on resourceId — make sure it did not silence real rows.
    const findings = evaluateFindings({ resourceType: 'AWS::EC2::Volume', resourceId: 'vol-9', 'configuration.encrypted': false });
    assert(findings.length === 1, 'the aggregate guard silenced a real resource');
  });

  test('the source column is not repeated on every row', () => {
    const cols = columnsFor(taggingRowsFrom([{ ResourceARN: 'arn:aws:s3:::b', Tags: [] }]));
    assert(!cols.includes('source'), 'source leaked into the table columns');
  });

  test('columns put identity fields first regardless of row shape', () => {
    const cols = columnsFor([{ zzz: 1, resourceId: 'a' }, { resourceType: 'T', awsRegion: 'eu-west-1' }]);
    assert(cols[0] === 'resourceType', `expected resourceType first, got ${cols[0]}`);
    assert(cols.indexOf('resourceId') < cols.indexOf('zzz'), 'identity field sorted after an arbitrary one');
  });

  // ───────────── findings ─────────────

  const sg = (rule) => ({
    resourceType: 'AWS::EC2::SecurityGroup',
    resourceId: 'sg-1',
    awsRegion: 'eu-west-1',
    'configuration.ipPermissions': JSON.stringify([rule]),
  });

  test('SSH open to the world is high severity', () => {
    const findings = evaluateFindings(sg({ fromPort: 22, toPort: 22, ipRanges: [{ cidrIp: '0.0.0.0/0' }] }));
    assert(findings.length === 1 && findings[0].severity === 'high', `expected one high finding, got ${JSON.stringify(findings)}`);
  });

  test('an all-ports rule is high because it necessarily exposes SSH and RDP', () => {
    // fromPort/toPort absent means every port — absence must widen, not narrow.
    const findings = evaluateFindings(sg({ ipRanges: [{ cidrIp: '0.0.0.0/0' }] }));
    assert(findings[0]?.severity === 'high', `all-ports rule was not high: ${JSON.stringify(findings)}`);
  });

  test('a public web server on 80/443 produces no finding', () => {
    assert(evaluateFindings(sg({ fromPort: 80, toPort: 80, ipRanges: [{ cidrIp: '0.0.0.0/0' }] })).length === 0, 'port 80 was flagged');
    assert(evaluateFindings(sg({ fromPort: 443, toPort: 443, ipRanges: [{ cidrIp: '0.0.0.0/0' }] })).length === 0, 'port 443 was flagged');
  });

  test('a rule scoped to a private CIDR is not flagged', () => {
    assert(evaluateFindings(sg({ fromPort: 22, toPort: 22, ipRanges: [{ cidrIp: '10.0.0.0/8' }] })).length === 0, 'a private CIDR was flagged as public');
  });

  test('IPv6 open to the world is caught, not just IPv4', () => {
    const findings = evaluateFindings(sg({ fromPort: 3389, toPort: 3389, ipv6Ranges: [{ cidrIpv6: '::/0' }] }));
    assert(findings[0]?.severity === 'high', 'IPv6 ::/0 on RDP was missed');
  });

  test('missing rule data reads as unknown, never as a clean pass', () => {
    const findings = evaluateFindings({ resourceType: 'AWS::EC2::SecurityGroup', resourceId: 'sg-2' });
    assert(findings.length === 1 && findings[0].severity === 'unknown', `absent rules did not produce unknown: ${JSON.stringify(findings)}`);
  });

  test('bucket encryption: absent field is unknown, explicit null is a finding', () => {
    const notReturned = evaluateFindings({ resourceType: 'AWS::S3::Bucket', resourceId: 'b1' });
    assert(notReturned.some((f) => f.severity === 'unknown'), 'un-queried encryption state was treated as fine');

    const noEncryption = evaluateFindings({
      resourceType: 'AWS::S3::Bucket',
      resourceId: 'b2',
      'supplementaryConfiguration.ServerSideEncryptionConfiguration': null,
    });
    assert(noEncryption.some((f) => f.severity === 'medium'), 'a bucket with no default encryption was not flagged');
  });

  test('an incomplete public access block is high severity', () => {
    const findings = evaluateFindings({
      resourceType: 'AWS::S3::Bucket',
      resourceId: 'b3',
      'supplementaryConfiguration.ServerSideEncryptionConfiguration': {},
      'supplementaryConfiguration.PublicAccessBlockConfiguration': JSON.stringify({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: true,
      }),
    });
    assert(findings.some((f) => f.severity === 'high' && /blockPublicPolicy/.test(f.detail)), `expected a high PAB finding, got ${JSON.stringify(findings)}`);
  });

  test('an unencrypted EBS volume is flagged for both boolean and string false', () => {
    for (const value of [false, 'false']) {
      const findings = evaluateFindings({ resourceType: 'AWS::EC2::Volume', resourceId: 'vol-1', 'configuration.encrypted': value });
      assert(findings.some((f) => f.severity === 'medium'), `encrypted=${JSON.stringify(value)} was not flagged`);
    }
    const encrypted = evaluateFindings({ resourceType: 'AWS::EC2::Volume', resourceId: 'vol-2', 'configuration.encrypted': true });
    assert(encrypted.length === 0, 'an encrypted volume was flagged');
  });

  test('nested configuration objects are judged the same as flattened ones', () => {
    const nested = evaluateFindings({ resourceType: 'AWS::EC2::Volume', resourceId: 'vol-3', configuration: { encrypted: false } });
    assert(nested.some((f) => f.severity === 'medium'), 'nested configuration shape was not understood');
  });

  // ───────────── tagging API normalisation ─────────────

  test('parseArn handles all three documented ARN shapes', () => {
    const bucket = parseArn('arn:aws:s3:::my-bucket');
    assert(bucket.service === 's3' && bucket.resourceId === 'my-bucket', `bucket ARN misparsed: ${JSON.stringify(bucket)}`);
    assert(bucket.region === null, 'S3 ARN should have no region');

    const instance = parseArn('arn:aws:ec2:eu-west-1:123456789012:instance/i-abc123');
    assert(instance.region === 'eu-west-1' && instance.resourceType === 'instance' && instance.resourceId === 'i-abc123', `slash ARN misparsed: ${JSON.stringify(instance)}`);

    const logGroup = parseArn('arn:aws:logs:eu-west-1:123456789012:log-group:my-group');
    assert(logGroup.resourceType === 'log-group' && logGroup.resourceId === 'my-group', `colon ARN misparsed: ${JSON.stringify(logGroup)}`);
  });

  test('parseArn returns null rather than guessing at a non-ARN', () => {
    for (const value of ['', 'my-bucket', null, undefined, 42]) {
      assert(parseArn(value) === null, `invented a parse for ${JSON.stringify(value)}`);
    }
  });

  test('tagging rows are labelled with their source and keep the raw ARN', () => {
    const rows = taggingRowsFrom([
      { ResourceARN: 'arn:aws:ec2:eu-west-1:123:instance/i-1', Tags: [{ Key: 'Project', Value: 'launchpad' }] },
    ]);
    assert(rows[0].source === 'tagging', 'tagging row was not labelled with its source');
    assert(rows[0].awsRegion === 'eu-west-1', 'region was not lifted out of the ARN');
    assert(rows[0].tags.Project === 'launchpad', 'tags were not flattened');
    assert(rows[0].arn.startsWith('arn:'), 'raw ARN was discarded');
  });

  test('an unparseable ARN still yields a row instead of vanishing', () => {
    const rows = taggingRowsFrom([{ ResourceARN: 'not-an-arn', Tags: [] }]);
    assert(rows.length === 1 && rows[0].resourceType === '—', 'unparseable ARN was dropped or mislabelled');
    assert(rows[0].resourceId === 'not-an-arn', 'unparseable ARN lost its identifier');
  });

  // ───────────── summary + links ─────────────

  test('summary counts every severity band it reports', () => {
    const summary = summariseResults([
      sg({ fromPort: 22, toPort: 22, ipRanges: [{ cidrIp: '0.0.0.0/0' }] }),
      { resourceType: 'AWS::EC2::Volume', resourceId: 'vol-1', 'configuration.encrypted': false },
      { resourceType: 'AWS::EC2::Volume', resourceId: 'vol-2', 'configuration.encrypted': true },
    ]);
    assert(summary.total === 3, `wrong total: ${summary.total}`);
    assert(summary.findings.high === 1 && summary.findings.medium === 1, `wrong finding counts: ${JSON.stringify(summary.findings)}`);
    assert(summary.types[0].count === 2, 'types were not ranked by count');
  });

  test('worstSeverity ranks high above medium and unknown', () => {
    assert(worstSeverity([{ severity: 'unknown' }, { severity: 'high' }, { severity: 'medium' }]) === 'high', 'severity ranking is wrong');
    assert(worstSeverity([]) === null, 'empty findings did not return null');
  });

  test('console links are omitted rather than emitted broken', () => {
    assert(consoleUrlFor({ resourceType: 'AWS::EC2::Instance', resourceId: 'i-1' }) === null, 'built a regional link with no region');
    assert(consoleUrlFor({ resourceType: 'AWS::S3::Bucket', resourceName: 'my-bucket' }).includes('my-bucket'), 'S3 link was not built');
    assert(consoleUrlFor({ resourceType: 'AWS::Unknown::Thing', resourceId: 'x' }) === null, 'invented a link for an unknown type');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
