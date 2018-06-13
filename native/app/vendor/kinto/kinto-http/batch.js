/**
 * Exports batch responses as a result object.
 *
 * @private
 * @param  {Array} responses The batch subrequest responses.
 * @param  {Array} requests  The initial issued requests.
 * @return {Object}
 */
export function aggregate(responses = [], requests = []) {
  if (responses.length !== requests.length) {
    throw new Error("Responses length should match requests one.");
  }
  const results = {
    errors: [],
    published: [],
    conflicts: [],
    skipped: [],
  };
  return responses.reduce((acc, response, index) => {
    const { status } = response;
    const request = requests[index];
    if (status >= 200 && status < 400) {
      acc.published.push(response.body);
    } else if (status === 404) {
      // Extract the id manually from request path while waiting for Kinto/kinto#818
      const regex = /(buckets|groups|collections|records)\/([^/]+)$/;
      const extracts = request.path.match(regex);
      const id = extracts.length === 3 ? extracts[2] : undefined;
      acc.skipped.push({
        id,
        path: request.path,
        error: response.body,
      });
    } else if (status === 412) {
      acc.conflicts.push({
        // XXX: specifying the type is probably superfluous
        type: "outgoing",
        local: request.body,
        remote:
          (response.body.details && response.body.details.existing) || null,
      });
    } else {
      acc.errors.push({
        path: request.path,
        sent: request,
        error: response.body,
      });
    }
    return acc;
  }, results);
}
