/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse } from 'msw';

const mockUsers = [
  {
    id: '1',
    type: 'users' as const,
    attributes: {
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice.martin@sprintforge.com',
      role: 'Product Owner',
      projectIds: [] as string[],
    },
  },
  {
    id: '2',
    type: 'users' as const,
    attributes: {
      firstName: 'Bob',
      lastName: 'Durant',
      email: 'bob.durant@sprintforge.com',
      role: 'Scrum Master',
      projectIds: ['proj-1', 'proj-2'],
    },
  },
  {
    id: '3',
    type: 'users' as const,
    attributes: {
      firstName: 'Claire',
      lastName: 'Dubois',
      email: 'claire.dubois@sprintforge.com',
      role: 'Developer',
      projectIds: ['proj-1', 'proj-2', 'proj-3'],
    },
  },
  {
    id: '4',
    type: 'users' as const,
    attributes: {
      firstName: 'David',
      lastName: 'Leroy',
      email: 'david.leroy@sprintforge.com',
      role: 'Developer',
      projectIds: ['proj-1', 'proj-3'],
    },
  },
  {
    id: '5',
    type: 'users' as const,
    attributes: {
      firstName: 'Emma',
      lastName: 'Bernard',
      email: 'emma.bernard@sprintforge.com',
      role: 'Designer UX',
      projectIds: ['proj-1', 'proj-2'],
    },
  },
  {
    id: '6',
    type: 'users' as const,
    attributes: {
      firstName: 'François',
      lastName: 'Petit',
      email: 'francois.petit@sprintforge.com',
      role: 'QA Tester',
      projectIds: ['proj-1'],
    },
  },
  {
    id: '7',
    type: 'users' as const,
    attributes: {
      firstName: 'Gaëlle',
      lastName: 'Moreau',
      email: 'gaelle.moreau@sprintforge.com',
      role: 'Developer',
      projectIds: ['proj-2', 'proj-3'],
    },
  },
];

export default [
  http.get('/api/v1/users/profile', () => {
    return HttpResponse.json({
      data: mockUsers[0]!,
    });
  }),
  http.get('/api/v1/users/{id}', (req) => {
    const { id } = req.params;
    const user = mockUsers.find((user) => user.id === id);
    if (user) {
      return HttpResponse.json({
        data: user,
      });
    } else {
      return HttpResponse.json(
        {
          errors: [
            {
              status: '404',
              title: 'User Not Found',
              code: 'USER_NOT_FOUND',
              detail: `User with id ${id as string} not found`,
            },
          ],
        },
        { status: 404 }
      );
    }
  }),
  http.get('/api/v1/users', ({ request }) => {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('filter[search]');
    const sortParam = url.searchParams.get('sort');

    let results = [...mockUsers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter((user) => {
        const firstName = user.attributes.firstName.toLowerCase();
        const lastName = user.attributes.lastName.toLowerCase();
        const email = user.attributes.email.toLowerCase();
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query)
        );
      });
    }

    // Apply sort
    if (sortParam) {
      const isDescending = sortParam.startsWith('-');
      const field = isDescending ? sortParam.slice(1) : sortParam;

      results.sort((a, b) => {
        let aValue: string | undefined;
        let bValue: string | undefined;

        if (
          field === 'firstName' ||
          field === 'lastName' ||
          field === 'email'
        ) {
          aValue = a.attributes[field];
          bValue = b.attributes[field];
        }

        if (aValue === undefined || bValue === undefined) {
          return 0;
        }

        const comparison = aValue.localeCompare(bValue);
        return isDescending ? -comparison : comparison;
      });
    }

    return HttpResponse.json({
      data: results,
      meta: {
        total: results.length,
      },
    });
  }),
  http.post('/api/v1/users/', async (req) => {
    const json = (await req.request.json()) as Record<string, any>;

    return HttpResponse.json({
      data: {
        id: json.data.lid,
        type: 'users' as const,
        attributes: json.data.attributes,
      },
    });
  }),
  http.patch('/api/v1/users/{id}', async (req) => {
    const json = (await req.request.json()) as Record<string, any>;

    return HttpResponse.json({
      data: {
        id: json.data.lid,
        type: 'users' as const,
        attributes: json.data.attributes,
      },
    });
  }),
  http.delete('/api/v1/users/{id}', (req) => {
    const { id } = req.params;
    const user = mockUsers.find((user) => user.id === id);
    if (user) {
      return HttpResponse.json(
        {
          data: null,
        },
        { status: 204 }
      );
    } else {
      return HttpResponse.json(
        {
          errors: [
            {
              status: '404',
              title: 'User Not Found',
              code: 'USER_NOT_FOUND',
              detail: `User with id ${id as string} not found`,
            },
          ],
        },
        { status: 404 }
      );
    }
  }),
];
