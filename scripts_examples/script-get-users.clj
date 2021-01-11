(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (userlist "get_users")
        [] auth_result)
  (call %init_peer_id% (returnService "") [auth_result])
     ))
