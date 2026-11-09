#!/usr/bin/env python3
"""Select the newest successful Vercel production deployment, never a preview."""
import json
import re
import subprocess


def api(path):
    return json.loads(subprocess.check_output([
        'gh', 'api', 'repos/Chessticize/v0-chessticize/' + path,
    ]))


def select():
    for deployment in api('deployments?environment=Production&per_page=100'):
        if deployment['creator']['login'] != 'vercel[bot]':
            continue
        statuses = api('deployments/{}/statuses?per_page=1'.format(deployment['id']))
        if not statuses or statuses[0]['state'] != 'success':
            continue
        sha = deployment['sha']
        url = statuses[0].get('environment_url', '')
        if not re.fullmatch(r'[0-9a-f]{40}', sha):
            raise ValueError('Invalid deployed source SHA')
        if not url.startswith('https://') or '\n' in url or '\r' in url:
            raise ValueError('Invalid deployment URL')
        subprocess.run(['git', 'merge-base', '--is-ancestor', sha, 'HEAD'], check=True)
        return sha, url
    raise RuntimeError('No successful Vercel production deployment found')


if __name__ == '__main__':
    selected_sha, selected_url = select()
    print('sha=' + selected_sha)
    print('url=' + selected_url)
